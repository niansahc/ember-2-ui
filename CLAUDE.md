# CLAUDE.md: ember-2-ui

## Response brevity

Reports and status updates: facts, numbers, hashes. No narrative.

No preamble. No "I'll now..." or "Let me..."
No postamble. No "Let me know if..." or "Want me to..."
No apology unless a real error occurred.
No restatement of the request before answering it.

Grill answers: number only unless clarification needed.

Report format: what changed, the identifier (commit/PR/branch), verification result. One line per fact when possible. Prose only when explanation genuinely aids understanding.

Do not narrate what you are about to do. Do it and report the result.

Exceptions: real diagnoses, real trade-off explanations, and grill findings where the model of the world matters. Verbosity there is signal.

---

## Repo identity

ember-2-ui: the React/Vite frontend for Ember-2. Tab color: MAGENTA. If you are not in C:\dev\Ember-2\ember-2-ui, stop and check.

It produces a static build that is copied into ember-2/ui/ and served by the ember-2 FastAPI backend. It is not a standalone app. Version v0.18.1 (published). Test counts live in the test runners, not here.

---

## Rules

- Do not modify the build output in ember-2/ui/ directly. Always build from source.
- Do not store sensitive data in localStorage beyond session IDs and UI preferences.
- Do not hardcode API URLs. Use the Vite proxy config.
- Do not use axios. Use native fetch.
- Mobile must work. Test viewport behavior for any UI change.
- Never render content Ember did not produce as if she produced it. There is no chat mock and no mock fallback: when a request fails, surface the failure. See ADR 0003 (`docs/adr/0003-no-fabricated-content-in-chat.md`).
- Do not use the word "shape" in any output.
- Never add Co-authored-by: Claude or any Claude attribution to commit messages or PR bodies. Attribution is acknowledged in docs/BUILDING_EMBER.md.
- Components listed in the codebase already exist. Search before re-implementing one.

---

## Test commands

**Playwright MUST be run in PowerShell, not bash.** The bash runner does not support the browser environment. This is the most common source of test failures.

```bash
npx playwright test --workers=2   # e2e (PowerShell); fewer workers avoids crashing the API
npm run test:unit                 # Vitest, node env, pure utils + mock
npm run build                     # production build
npm run dev                       # dev server
```

### Testing discipline

**The default lane is green-by-construction.** Only deterministic capability gates may skip (e.g. "Vite dev server required for ESM import"). Zero backend-dependent runtime skips, zero `test.fixme`. A test that skips itself when the backend is slow or absent masks an infrastructure failure as a pass.

**Backend-dependent tests are tagged, not skipped.** Specs that genuinely require a live backend (Ollama, real model round-trips) are tagged `@needs-live-backend` and excluded from the default lane via `grepInvert` (ADR 0001, `docs/adr/0001-ui-test-backend-boundary.md`). Run them before a release:

```powershell
$env:EMBER_LIVE_BACKEND=1; npx playwright test --grep "@needs-live-backend"
```

The default lane proves rendering and interaction against a known API contract using mocked endpoints (synthetic fixtures only, per the Vault Privacy Rule). It does not prove the backend honors that contract; that is the backend repo's job plus the pre-release live run.

**Streaming regression (`tests/e2e/streaming-regression.spec.cjs`).** The default lane mocks the chat endpoint, so it proves only the UI half: the client asks for SSE and consumes the terminal frames. It cannot fail because the backend regressed to JSON. The `@needs-live-backend` lane in the same file removes the mock and would go red if the backend stopped emitting SSE. A failing live run on the clarification terminal may mean Ollama is down, not a contract break.

**Flaky tests do not carry forward.** A flaky or condition-dependent test found during a release cycle must be fixed or moved to the `@needs-live-backend` lane before that release ships. A test that sometimes passes is broken.

**Absence assertions need a positive control.** Any test asserting an absence (nothing recorded, nothing written, count is zero, value stayed in bound) ships with a positive control in the same commit: a second test that makes the condition occur and asserts the first test's assertion fails. Without it the absence test is vacuous.

---

## UI design gates

**Internal fields never reach the user directly.** Database field names, taxonomy category keys, acquisition path values, source tags, and other internal classification terms must never be rendered as user-facing labels. Define all user-facing display strings before UI implementation begins.

**Taxonomy display names must be approved before UI work starts.** If a feature introduces categories, types, or classifications, the user-facing name and description for each must be documented and approved in the ADR or feature spec before M writes UI code. Internal keys (e.g. "ground", "character", "onboarding") are not display names.

**UI must be built against clean data.** Do not build or review UI against broken, partial, or pre-inference data. If the backend is not ready, M mocks clean data to spec. Connect real data only after it meets the expected schema.

**Design before implementation.** For any panel or view that surfaces user data, the information architecture (what the user sees, in what order, what each element means) must be described and approved in this chat before M builds it. Prompts that skip this step will be sent back.

---

## Vault privacy rule

Vault contents (names, conversation text, record IDs) must never appear in code, tests, commits, scripts, or docs. This rule has no exceptions. If a test requires memory data, use synthetic fixture data only.

---

## Working conventions

- Small, frequent commits with clear messages. Commit before moving to the next item.
- No releasing until the human says so.
- If the human says PAUSE, stop and reorient. If the human says STOP, drop the topic entirely.

---

## Doing the work

- If the correct fix is blocked, larger than scoped, or a test looks wrong, stop and report it. Do not substitute a workaround, partial fix, or fallback that hides the failure.
- Tests verify correctness; they do not define the solution. Do not edit a test to make it pass unless the prompt names it.
- Comments: match the surrounding file's density. Comment only a non-obvious why. No comments that restate the code, narrate the change, or explain a shortcut.
- Reports state: commands run with their results; what was not verified; shortcuts or deviations from the plan; what is incomplete. A claim without a run behind it is labelled unverified.

---

## Release process

Gates, mandatory before any release or patch is cut:

- Documentation: CLAUDE.md version current, README reflects current features, CHANGELOG.md current (release-please handles it via commits).
- Quality: all tests passing, no flaky tests carried forward.
- Coordination: all three repos (G, M, Y) confirm docs and tests green; the human approves before any tag is created; no GitHub Release until the human says go.

Sequence: G, M, Y each complete the gates and report green to the manager. The manager confirms all three and gets human approval. G coordinates the release (tags all three repos, creates GitHub Releases). Y attaches installer artifacts (.exe, latest.yml). G verifies all three releases are public and reports the URLs; the release is not done until then. Y may cut an installer-only release with explicit human approval when no backend or UI changes are involved.

release-please drives release PRs in all three repos. Conventional commits are required. Release PRs need human approval before merging.

---

## Git hooks (business hours push protection)

Pushes are blocked during US Eastern business hours (9am-5pm Mon-Fri) by a local pre-push hook (`hooks/pre-push`) and a GitHub Actions check (`.github/workflows/business-hours-check.yml`). Git hooks are not committed; install after cloning:

```bash
cp hooks/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

---

## Claude Code hooks

Configured in `.claude/settings.json` (project-level, committed).

- **PreToolUse, `.env` protection:** blocks any Edit or Write to files matching `.env*` with a `decision: block` response. No exceptions.
- **PostToolUse, Playwright runner:** after any Edit or Write to `src/**/*.{jsx,js,css}`, runs `npx playwright test --workers=2` via PowerShell in the background. Skips docs, config, and tests. Timeout 5 minutes.

Scheduled tasks: weekly dependency audit of package.json; pre-release cross-repo check that the UI matches backend API responses.

Name sessions descriptively (`claude -n "vault-citation-backend"`) so they can be resumed.
