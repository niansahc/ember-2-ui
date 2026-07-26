# ADR 0003 — No fabricated content in the chat transcript

- Status: Accepted
- Date: 2026-07-26
- Relates to: the mock-fallback incident (see Context). Supersedes the API-first / mock-fallback pattern for chat only.

## Context

`useChat` was built on an "API-first, mock-fallback" pattern: try the real
Ember API, and on any failure fall back to `api/mock.js`. For lists and chrome
that was reasonable. For chat replies it was not.

`mockStreamChat` did not emit obvious placeholder text. It emitted six canned
responses written to look exactly like Ember, including:

- "Based on your recent journal entries, I notice you've been circling back to
  this theme of **balance**"
- "on March 15th you wrote about feeling pulled between two priorities"
- a block formatted as web search results with invented headlines and a date

`mockGetMessages` was worse in kind: it fabricated entire past conversations,
which read as the user's own history rather than as a single bad answer.

Three properties made this dangerous rather than merely untidy:

1. **It was indistinguishable from a real reply.** Same bubble, same styling,
   same voice. The only signal was a `console.warn`.
2. **It made claims about the user's own vault.** Invented journal entries and
   invented dates are not neutral filler. A user cannot verify them without
   going and looking, and the whole premise of the product is that Ember
   remembers things they said.
3. **It triggered on ordinary conditions.** Not an exotic failure. The model
   server updated overnight and did not restart, and every reply from then on
   was fabricated.

That last point was the incident that prompted this. `/api/health` returned
200 with a model name and `docker: ok` throughout, because the FastAPI process
was fine. Only the model provider was down. So the existing health signal, and
the `ServiceStatus` dot that renders it, showed green the entire time.

Two secondary defects compounded it. `apiAvailableRef` latched `false` on the
first failure and was never reset, so one blip downgraded the rest of the
session until a page reload. And every failure kind produced identical
behavior, so a dead backend, a stale API key, a rate limit, and a broken
generation pipeline were indistinguishable to the user.

## Decision

**No content that did not come from the model may be rendered as a model
reply. Ever.**

Concretely:

1. `mockStreamChat` and `mockGetMessages` are **deleted**, not flagged or
   disabled. There is no chat mock to re-enable.
2. `streamChat` throws a structured `EmberApiError` carrying `{ kind, status,
   body }`. `kind` is one of `unreachable`, `generation_failed`,
   `unauthorized`, `rate_limited`, `unknown`.
3. User-facing wording lives in `src/utils/chatError.js`, a pure module with
   no React and no fetch, so it is unit tested directly.
4. Failures render as an error turn marked `isError: true`. It uses a distinct
   visual treatment, `role="status"`, no copy or regenerate affordance, and a
   single **Try again** button.
5. Error turns are filtered out of the history sent to the API, so UI-authored
   text is never fed back to the model as its own words.
6. `apiAvailableRef` is removed entirely. Every send attempts the network.
7. Error copy is provider-aware, derived from the active model id using the
   same prefix rule the backend uses (`claude-` is Anthropic, `gpt-` is
   OpenAI, anything else is the local runtime).

The mocks for sidebar lists, model lists, the update check, and the splash
probe **stay**. The distinction is not "mocks are bad": it is that a wrong
answer from those surfaces is visibly wrong and makes no claim about the
user's own data, whereas a fabricated reply is undetectable by the person
worst placed to detect it.

## Alternatives considered

**Keep the mock behind a dev-only flag.** Rejected. It preserves the ability
to develop the chat UI with no backend, which is a real loss, but it leaves
the fabrication code in the tree one config mistake away from users. The
capability is not worth that standing risk, and Playwright route mocks already
cover the development and testing need without shipping anything.

**Gate send on `ServiceStatus` health.** Rejected on evidence. Health returned
200 throughout the incident, so this would not have caught it. It also fails
the other way: health has a 10 second timeout and a two-failure debounce, so a
false red would lock the user out of a working backend.

**One generic error message.** Rejected. "Start Ollama", "check your API key",
and "wait a minute" are different actions. A merged message cannot tell the
user which applies, and telling a Claude user to start Ollama is confidently
wrong.

**A banner instead of an in-transcript turn.** Rejected. The failure is the
answer to one specific message, so it belongs where that answer would have
been. In a long thread a banner detaches the error from the message that
caused it.

## Consequences

**Good.**

- Nothing fabricated can reach the transcript. The code path does not exist.
- The user learns what broke and what to try, and can retry in one click.
- A transient failure no longer poisons the rest of the session.
- Provider-specific guidance stays correct as cloud models are adopted.
- `chatError.js` is pure, so the copy is covered by fast unit tests rather
  than only through the browser.

**Costs, accepted.**

- **Developing the chat UI with no backend is gone.** Previously the app
  degraded into a usable demo. Now it shows an error. Use Playwright route
  mocks, or run the backend.
- **One failed request per send when the backend is down**, instead of one per
  session. This is the direct cost of removing the latch, and it is the right
  trade: the alternative was lying quietly.
- **Eight strings to keep in Ember's voice**, plus the provider prefix rule
  duplicated from the backend. The duplication is deliberate (the alternative
  is a network call at the moment the network is known to be broken) but it
  does mean a new provider needs a matching edit here.

## Compliance

If you are about to add anything to `api/mock.js` that speaks as Ember, or to
reintroduce a fallback that fills an assistant bubble with locally generated
text, this ADR says no. Surface the failure instead.
