# Changelog

## [0.6.4](https://github.com/niansahc/ember-2-ui/compare/ember-2-ui-v0.6.3...ember-2-ui-v0.6.4) (2026-04-05)


### Features

* add About panel with Ember's story, beliefs, and full ethos ([eb7d3bd](https://github.com/niansahc/ember-2-ui/commit/eb7d3bd321089c07c4383ee7499b50f9d3776300))
* add edit button on user messages to edit and resend ([83c94b0](https://github.com/niansahc/ember-2-ui/commit/83c94b047ab88e72d09c61590d7569c7af64b6e5))
* add Playwright e2e testing setup for UI — sidebar, settings, model indicator ([2829b37](https://github.com/niansahc/ember-2-ui/commit/2829b376866965c275a9258c4468c018b085fbcd))
* add Playwright tests for file upload, model switching, and mobile viewport ([c382540](https://github.com/niansahc/ember-2-ui/commit/c3825402b39face92efbb444f5b41c2c988434b4))
* add PWA manifest for home screen installation on Android and iOS ([2671ace](https://github.com/niansahc/ember-2-ui/commit/2671acebc9607b0807560e0556d0549380d831bc))
* ADR-012 Phase 2 UI — lock screen, PIN setup, idle timeout, settings controls ([1ffd61d](https://github.com/niansahc/ember-2-ui/commit/1ffd61d253430ebe7a8a775015bfa560276cfae5))
* conversational style selector in settings UI ([35a8aa3](https://github.com/niansahc/ember-2-ui/commit/35a8aa33a65d06fd87c07cf5d7a2c4be46a1b8cd))
* file attachment split — images to chat, documents to vault ([ac9b8f0](https://github.com/niansahc/ember-2-ui/commit/ac9b8f0b2a3e98711cdc060e50ce69a541beb9c4))
* guided first-run UI tour using Shepherd.js ([a2273a4](https://github.com/niansahc/ember-2-ui/commit/a2273a47ca088ff5ab68a4124c971549f6190ec6))
* initial UI scaffold with chat, sidebar, settings, themes, accessibility, mock API ([e0c4e1f](https://github.com/niansahc/ember-2-ui/commit/e0c4e1fe7bee70a404e3d7ebc8692b78a03382bc))
* multi-image upload — select and send multiple images in a single message ([e16566c](https://github.com/niansahc/ember-2-ui/commit/e16566ce52e109f82d9314607110ddd8d09ddcb1))
* refresh task tray immediately when chat streaming ends ([1441051](https://github.com/niansahc/ember-2-ui/commit/1441051084e0ff2bef963cb54e47b4da91a65a66))
* task tray in sidebar — bottom-anchored, follows conversation list visual style ([cd1217f](https://github.com/niansahc/ember-2-ui/commit/cd1217f76e15da240500dd93877b4c83456b6777))
* **ui:** custom theme with color picker ([96e716e](https://github.com/niansahc/ember-2-ui/commit/96e716ed70bcc7752b2481362d0bc904c04c13d5))
* **ui:** nature constellation toggle, copyright footer, version fallback fix ([16fbe78](https://github.com/niansahc/ember-2-ui/commit/16fbe783970d5b38141f79a2cabff958c895ae87))
* **ui:** open all chat response links in new tab ([66d97b2](https://github.com/niansahc/ember-2-ui/commit/66d97b24c57d73eeb3ae665bbf74e62e53dd98fc))
* **ui:** web search before indicator, grounding check signals, inline source citations ([239983d](https://github.com/niansahc/ember-2-ui/commit/239983d8826dcfaa9dd199e2fa7632df8f7e1b77))
* **v0.11.0-wip:** .txt upload support, document context injected into chat message ([9fa9e13](https://github.com/niansahc/ember-2-ui/commit/9fa9e13195ab5cedbae0251d0e163ec3c65eba7c))
* **v0.11.0-wip:** add OpenAI models to Cloud tab — gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo ([ae9ef56](https://github.com/niansahc/ember-2-ui/commit/ae9ef56119084ac892217df41afc5ff0a58314e7))
* **v0.11.0-wip:** collapsible sidebar, model indicator, local/cloud model selector tabs, cloud disclosure, vision default on ([7ada90c](https://github.com/niansahc/ember-2-ui/commit/7ada90c682e4cefe8204bd3c0981c76e31b3f1b3))
* **v0.11.0-wip:** fix sidebar icon row order — new, search, collapse ([0efb959](https://github.com/niansahc/ember-2-ui/commit/0efb9595f25a3b9770d6f453123014ad1d75dc89))
* **v0.11.0-wip:** move model indicator to top bar next to Ember-2 title ([de137b4](https://github.com/niansahc/ember-2-ui/commit/de137b4106a769364f957f981ce9c7ab8970f1b5))
* **v0.11.0-wip:** remove search icon from sidebar top row, keep plus and collapse only ([fb3b9f1](https://github.com/niansahc/ember-2-ui/commit/fb3b9f1aaec17089804ce21974995ab6c8bd968d))
* **v0.11.0-wip:** secure API key entry in Cloud tab — masked input, system credential store, never displayed ([fbc34d9](https://github.com/niansahc/ember-2-ui/commit/fbc34d9dc86bd7bb7f07fd6f224928620adfccff))
* **v0.11.0-wip:** vault path masking with timed reveal — ADR-012 Phase 1 ([7dbeca1](https://github.com/niansahc/ember-2-ui/commit/7dbeca1e067222b0522d066e4cdec3f52077f645))
* web search info tooltip in settings with accurate privacy description ([d1dfd52](https://github.com/niansahc/ember-2-ui/commit/d1dfd52a8f9120d18845d5453832eb208ddbe57e))
* web search transparency indicator on messages that used web search ([74b8a13](https://github.com/niansahc/ember-2-ui/commit/74b8a13d6f44b40e86c8a4077a413987cd04299e))
* wire all components to real Ember API with mock fallback ([acef693](https://github.com/niansahc/ember-2-ui/commit/acef6938e8825b41e902c820a9f6684fd8f01e3b))
* wire sidebar to real projects API with mock fallback ([01f2e7e](https://github.com/niansahc/ember-2-ui/commit/01f2e7e70470414bd5067c48e422a274c8c374a1))
* wire UI to streaming API — tokens appear in real time ([c2ee27b](https://github.com/niansahc/ember-2-ui/commit/c2ee27bf969117a4b3a3003d425bf8e9f86278d8))


### Bug Fixes

* add new conversation button and search bar to project detail sidebar view ([b651cec](https://github.com/niansahc/ember-2-ui/commit/b651cec3e115e8b14a0d435934892fabbcce53db))
* add New Project button and context menu option to sidebar UI ([fa40561](https://github.com/niansahc/ember-2-ui/commit/fa405618599725926ee0be05adb6300d2f0b1581))
* edge case tests — overlay click blocking, mobile settings selector ([c821880](https://github.com/niansahc/ember-2-ui/commit/c8218801be153562861fa083950dbb933b21d8a5))
* filter vunknown/unknown version values from backend health endpoint ([a717dde](https://github.com/niansahc/ember-2-ui/commit/a717dde3873119d1d6fb30fdaaccda6f4dd65e62))
* increase project row wait timeout in sidebar e2e tests — 5s instead of 2s ([4d90040](https://github.com/niansahc/ember-2-ui/commit/4d90040f6c75a27c549c337e3a193ed4db51751e))
* increase task tray visibility timeout to cover full poll interval ([aaecc35](https://github.com/niansahc/ember-2-ui/commit/aaecc35add61c87b90ea3318b83b1d95257b6137))
* mobile chat input missing + project conversations not saving to project ([19c0b31](https://github.com/niansahc/ember-2-ui/commit/19c0b31b0d5d3d5d88f69a8d711a020d15efa7a7))
* parse hyphenated vault timestamps correctly -- no more Invalid Date in chat UI ([ec0ca4d](https://github.com/niansahc/ember-2-ui/commit/ec0ca4ddfb32d51d14a1e590c5c5cee9df67ea85))
* prefer runtime-injected API key over build-time env var ([9ab93e0](https://github.com/niansahc/ember-2-ui/commit/9ab93e0dcd6eb825f0bd8204c76807bdb9a6c1ad))
* replace dangling SearchBar component reference with inline JSX ([ba14b8f](https://github.com/niansahc/ember-2-ui/commit/ba14b8fa41750e10f94246dfef833342073242d6))
* restore active conversation on page refresh via localStorage ([5703cca](https://github.com/niansahc/ember-2-ui/commit/5703cca5747320b4aaefa37aec87f424470f6d19))
* search bar no longer loses focus on each keystroke ([59a6727](https://github.com/niansahc/ember-2-ui/commit/59a6727408210c9b30b2c90bb86ed6af512ff8fa))
* show API key setup instructions on splash when VITE_EMBER_API_KEY is missing ([d8a45f8](https://github.com/niansahc/ember-2-ui/commit/d8a45f887f0cfb125d8bd64f7377b24af78a27b1))
* skip task tour step when no tasks exist — cleaner for new users ([b3fcf19](https://github.com/niansahc/ember-2-ui/commit/b3fcf196750d8c80376492a296f8d05f05af9f39))
* stabilize task tray uncheck test — add wait for task write before reload ([3e6d6af](https://github.com/niansahc/ember-2-ui/commit/3e6d6afa01189c8982b71adb3e8a58f57f90405b))
* task tray — checkbox reappear, title navigation, expand/collapse ([17dfdc6](https://github.com/niansahc/ember-2-ui/commit/17dfdc6627953c665d52c994a0ffffaeb6209e58))
* task tray checkbox toggles done/active state without disappearing, task title navigation wired to session ([8fc25d3](https://github.com/niansahc/ember-2-ui/commit/8fc25d31ea82db3ef830688df53e6797a6cd0e09))
* task tray max-height and internal scroll -- tasks no longer push settings off screen ([9234c02](https://github.com/niansahc/ember-2-ui/commit/9234c024e4f21b662d5285cd61c4d6f907f0ef16))
* **tests:** floating point precision in mobile overflow test, version test timeout ([4c28543](https://github.com/niansahc/ember-2-ui/commit/4c28543738ab8b2437af56bfdb2c1ea0a56ef16a))
* tour step z-index above modal overlay — buttons now clickable ([485f85a](https://github.com/niansahc/ember-2-ui/commit/485f85af6181fe5334b020c926c1453bcb3dfe8e))
* **ui:** conversation navigation, task click navigation, task delete button ([553cb60](https://github.com/niansahc/ember-2-ui/commit/553cb6081226bb5a964e31cc7159cb88020d9340))
* **ui:** prevent duplicate API calls on load with StrictMode-safe effects ([68c56a5](https://github.com/niansahc/ember-2-ui/commit/68c56a5a3138765f02c412e193f7b8891fff2869))
* **ui:** prevent source citation overflow on narrow mobile viewports ([a5290a5](https://github.com/niansahc/ember-2-ui/commit/a5290a5dc9ecc058e4b0c238d645c661a2151fcb))
* **ui:** sidebar re-fetches conversations on navigation and stream end ([6188382](https://github.com/niansahc/ember-2-ui/commit/6188382025904db2439773d258623da9a7030f13))
* **ui:** task delete waits for API confirmation, shows inline error on failure ([69dd6ff](https://github.com/niansahc/ember-2-ui/commit/69dd6fff3c5aa6d2dc4b13260cfef80bfb17ddf1))
* **v0.11.0-wip:** cloud model selection calls POST /model to actually switch the active model ([7c8aa82](https://github.com/niansahc/ember-2-ui/commit/7c8aa82b93816a5f1d271b18152d2bf3a50791a6))
* **v0.11.0-wip:** collapse chevron at top when sidebar is collapsed ([f680059](https://github.com/niansahc/ember-2-ui/commit/f680059054a28d93155ea28761e422358cbc5fcc))
* **v0.11.0-wip:** explicit Remove key button with confirmation dialog replaces ambiguous X ([355678a](https://github.com/niansahc/ember-2-ui/commit/355678aed1444f9c30437b630f34e6d0a032efd9))
* **v0.11.0-wip:** persist vision model toggle and selection in localStorage ([5dff195](https://github.com/niansahc/ember-2-ui/commit/5dff19557aa042e97a2913a5a7c0361ec83c4259))
* **v0.11.0-wip:** remove API key input from UI — display only, add set_provider_key.py CLI script ([3b8892f](https://github.com/niansahc/ember-2-ui/commit/3b8892fcc12c1ddfdd10b8db48b9548e5b029087))
* **v0.11.0-wip:** restyle model tabs as underline tabs for visibility ([1ad806c](https://github.com/niansahc/ember-2-ui/commit/1ad806ce88481052c15712c5f358492699fd8024))
* **v0.11.0-wip:** show search icon in collapsed sidebar, expands and focuses search ([4b58144](https://github.com/niansahc/ember-2-ui/commit/4b58144930eb3427e7a5f0fbaa0c0b0506df0562))
* **v0.11.0-wip:** Updates panel reads installed version from API instead of hardcoded string ([cdf50ff](https://github.com/niansahc/ember-2-ui/commit/cdf50ff5bca423b03e22b5d3c8e83a006d444771))
* wire API key auth across all ember.js calls ([34bc91d](https://github.com/niansahc/ember-2-ui/commit/34bc91d2130bfdd5dc463fa376e8f1494d22a99d))

## v0.6.3 — 2026-04-05

### Bug Fixes
- Duplicate API calls on load — StrictMode-safe cleanup flags on all data-loading useEffects (conversations, projects, tasks, version) prevent 4-6 rapid-fire calls per endpoint on page load
- Task delete error handling — delete now waits for API confirmation before removing from UI; shows inline error on failure (auto-clears after 4s)
- Source citation overflow — overflow-wrap on .bubble-sources prevents long titles from breaking layout on narrow mobile viewports (375px/390px)

### Tests
65 Playwright tests (58 passing, 4 skipped, 3 pre-existing backend-dependent)

## v0.6.2 — 2026-04-04

### Bug Fixes
- Conversation navigation — sidebar click now loads conversation history via /turns endpoint instead of empty metadata response
- Task click navigation — clicking a task navigates to its originating conversation using metadata.session_id
- Task delete button — cancel (X) button on each task, calls DELETE /v1/tasks/{id}, optimistic removal from sidebar

### Features
- Chat response links open in new tab — custom react-markdown renderer adds target="_blank" rel="noopener noreferrer"

## v0.6.1 — 2026-04-04

### Bug Fixes
- Version display — filter "vunknown" and "unknown" values from backend health endpoint; sidebar shows loading state instead of bad version string

## v0.6.0 — 2026-04-04

### Features
- Nature constellation in About panel — 13 facets from nature.yaml v0.1, collapsible toggle below ethos
- Web search before indicator — "Searching the web..." status shown immediately when web search triggers, before results arrive
- Grounding check activity signals — "Verifying..." and "Refining..." status indicators during grounding check and revision pass
- Inline source citations — compact linked sources block below web search responses (max 5)
- Custom theme with color picker — user-defined accent and background colors, persists in localStorage
- Copyright footer — © 2026 M. Chastain Flournoy. All rights reserved.

### Bug Fixes
- Version display — no longer shows "vunknown" when API is unreachable; displays loading state or hides
- Restored index.html source entry — had been overwritten by dist output during deploy
- Runtime API key injection — `window.__EMBER_API_KEY__` preferred over build-time env var
- API key splash instructions — fresh install users see setup guidance instead of generic error

### Docs
- Release workflow documentation (docs/RELEASE_WORKFLOW.md)
- Release checklist hardened — CC owns full release process end to end

### Tests
65 Playwright tests (58 passing, 4 skipped, 3 pre-existing flaky)
- Edge case test suite: input handling, layout stability, localStorage resilience, mobile layout
- Streaming signals and sources tests
- About nature constellation tests

## v0.12.0 — 2026-04-02

### Features
- Multi-image upload — select and send multiple images in a single message; thumbnails shown above message text
- Web search transparency indicator — magnifying glass icon on messages that used web search
- Web search info tooltip in settings — accurate privacy description of SearXNG routing and IP stripping
- Conversational style selector — Casual/Balanced/Thoughtful card selector in settings; persists via preferences API
- Task sidebar tray — bottom-anchored below conversations, checkbox to complete, cancel button, end-of-day expiry, 30s polling, internal scroll capped at ~5 tasks
- Task tray behavior — done tasks persist today with strikethrough, expire end of day, cancelled tasks removed immediately
- Guided first-run tour — Shepherd.js, 6 steps, triggers once via preferences API, keyboard accessible, Ember-themed dark styling
- Restore active conversation on refresh — localStorage persistence of active session
- Regenerate button — confirmed working on last assistant message

### Bug Fixes
- Timestamp fix — hyphenated vault timestamps now parsed correctly, no more Invalid Date in chat UI
- Task tray max-height — tasks no longer push settings off screen; internal scroll within tray
- Soft-deleted conversations — confirmed filtered correctly; regression tests added

### Tests
40 Playwright passing, 3 skipped (up from 36 at v0.11.0)

## v0.3.0 — 2026-03-27
- Streaming responses via streamChat() — real-time token rendering
- PWA manifest — installable as home screen app
- New Project button always visible in sidebar
- Project conversations auto-assigned on creation
- Edit and resend user messages (pencil icon on hover)
- Mobile viewport fix (100dvh)
- Consistent Ember-2 branding throughout
- Stop button works during streaming
- crypto.randomUUID fallback for non-secure contexts (Tailscale HTTP)
- Chat input bar stays visible on long responses (flex min-height fix)

## v0.2.1 — 2026-03-24

### Projects — Real API
- Sidebar now loads projects from `GET /v1/projects` with mock fallback
- Move conversation to project calls `PATCH /v1/conversations/{id}` with `project_id`
- Added to ember.js: `getProjects()`, `createProject()`, `renameProject()`, `deleteProject()`, `getProjectConversations()`, `moveConversationToProject()`
- All operations use optimistic UI updates with async API calls

### API Connectivity
- Vite proxy configured for all backend routes — zero CORS in development
- Health check uses `/v1/models` endpoint (works through proxy)
- All API calls use centralized `authHeaders()` with `VITE_EMBER_API_KEY`

## v0.2.0 — 2026-03-24

First fully functional release of Ember's custom frontend.

### Chat
- Streaming message display with markdown rendering (headings, code blocks, tables, blockquotes, lists)
- Copy message to clipboard, regenerate last response, scroll-to-bottom button
- Typing indicator while Ember is thinking
- Export conversation as markdown (Ctrl+Shift+E)
- Multi-file attachment: images sent as vision input, documents (.pdf, .docx, .csv, .xlsx) uploaded to vault via POST /ingest/upload
- Thumbnail previews for images, file icons for documents, "Sent with your message" / "Added to your vault" labels

### Sidebar
- Conversation list loaded from real API (GET /v1/conversations)
- Projects section with colored dots and conversation counts (UI-only, no backend yet)
- Chronological grouping: Today, Yesterday, Last 7 days, Last 30 days, Older
- Search bar filters conversations by keyword
- Right-click context menu: rename, move to project, delete
- Rename and delete persist to backend (PATCH/DELETE /v1/conversations)

### Settings
- 5 color themes: Ember (purple/orange), Midnight (black/silver), Forest (green), Ocean (blue), Bloom (light pink)
- Theme persisted in localStorage, instant switch
- Model selector populated from real Ollama model list
- Vision model toggle with separate model dropdown
- Web search toggle, conversation memory toggle, tone selector
- Vault path display, check for updates, report a bug, about Ember

### About Panel
- Ember's origin story (Ember-1 → Ember-2)
- Three belief cards: owned intelligence, knowing vs profiling, right to leave
- Expandable full ethos (10 principles)
- License links (AGPL-3.0 + CC BY-NC 4.0), GitHub link, bug report

### Bug Reports
- Submit directly to GitHub Issues API (niansahc/ember-2)
- Title + description form, success state with issue link

### Updates
- Checks GitHub Releases API for latest version
- Shows current vs latest version with changelog viewer

### Accessibility (WCAG 2.1 AA)
- All color combinations pass 4.5:1 contrast ratio
- Keyboard navigable throughout, focus indicators on all elements
- Focus trap in modals, Escape closes all panels
- role="switch" on toggles, aria-modal on dialogs, aria-live for streaming
- prefers-reduced-motion respected
- Screen reader friendly: aria-labels, heading hierarchy, semantic HTML

### API Integration
- Real API client (src/api/ember.js) with mock fallback on all operations
- Session tracking: generates sess_id per conversation, passes X-Session-ID header
- Vite proxy for development (no CORS issues)
- API key auth via VITE_EMBER_API_KEY environment variable
- Console warning if API key is missing

### Keyboard Shortcuts
- Ctrl+N — new conversation
- Ctrl+, — toggle settings
- Ctrl+Shift+E — export conversation
- Escape — close modals and sidebar

## v0.1.0 — 2026-03-24

Initial scaffold with mock API layer.
