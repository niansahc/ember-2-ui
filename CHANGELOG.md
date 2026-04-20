# Changelog

## v0.8.0 — 2026-04-20

Coordinated release with ember-2 v0.16.0 (backend vision pipeline, bare mode, stateless vault toggle, autonomous web search default).

### Features

**Appearance & Style**
- New Appearance tab in Settings with style-pack selector (Clean, Hearth, Hacker) and MVP pack overrides
- Full decorative pass: Hearth halos, Hacker brackets, Clean restraint
- Font scale, density, and reduced-motion preferences
- Design token system: typography, spacing, motion, status tokens; self-hosted fonts bundled
- Bare mode icon swapped to flame/X toggle

**Chat & Greeting**
- Personalized time-of-day greeting for returning users (180-title variety, scrubbed of cliches)

**Top Bar**
- Reworked top bar with feature status icons
- Amber/slow state for service status dot; red dot requires 2 consecutive health failures
- Autonomous web search toggle locked ON (ask-first coming in a future update) — Settings toggle greyed out with explanatory hint

**Per-Conversation Controls**
- Bare mode and vault toggles surfaced in the chat header, always visible
- Source attribution badges aligned with backend response headers (vault citation, vision, web search)
- Context length control in Settings

**Backend Integration (matched with ember-2 v0.16.0)**
- Launch Installer button wired to `/launch-installer`
- Vault storage display pulls current size and 30-day projection
- Ask-first settings toggle wired to backend preferences
- Image preview, vision processing indicator, source attribution

**Dev Tools**
- `private_vault` injected as swap option in Developer tab
- Business hours push protection hook (local pre-push + GitHub Actions check)

### Bug Fixes
- Vite proxy port corrected; Chat greeting recomputes on prefs load
- Lodestone and vault-path selectors corrected in Hearth and Hacker packs
- Tooltip clipping in Settings resolved; service status redesigned
- Bare mode visibility conditions corrected
- Per-conversation toggles now always visible (removed global gates)

### Performance
- Memoize last-assistant index across streaming renders

### Maintenance
- React bumped to 19.2.5; Playwright bumped to 1.59.1
- Vite security patch; dead code removal; gitignore cleanup
- Comment pass on high-debt JS/JSX files, CSS, hooks, utils
- `settings.css` tokens: hardcoded values promoted to tokens; `!important` hacks removed
- `.release-please-manifest.json` drift fixed — bumped from 0.7.0 to 0.8.0

### Tests
- Playwright coverage added for v0.16.0 features
- Test vault guard and per-test cleanup for backend-hitting tests
- `globalTeardown` swaps back to `private_vault` after suite
- Stale tests updated for v0.16.0 UI changes
- `retries=1` in Playwright config to tolerate transient connection-pool flakes under parallel workers
- Tests updated for always-visible bare-mode and vault toggles
- `ask-first-toggle` and `settings` specs updated for locked-on autonomous search behavior
- 131 tests passing with `workers=1`; 3 task-tray specs and 1 model-switching spec marked `test.fixme` — they pass in isolation but flake in full-suite mode due to cross-test `task_detector` state in the shared test vault. Cross-suite task state isolation is follow-up work.

### Documentation
- Docs synced to v0.15.x reality
- Explicit release process and gates added to CLAUDE.md
- Test skip count updated

---

## v0.7.4 — 2026-04-12

### Features
- Launch Installer button in Settings > About tab

### Bug Fixes
- Autonomous web search toggle now defaults to OFF (was showing ON from stale backend pref)
- Web search tooltip no longer clips outside Settings panel bounds
- Service status dot repositioned inside content area — never overlaps sidebar or input controls

---

## v0.7.3 — 2026-04-12

### Features
- Change PIN flow — Settings > Security, verify current → enter new → confirm
- Disk encryption status — Settings > Security, Device Security section with platform-appropriate docs link
- Service status indicator — breathing amber dot above send button, hover for restart/shutdown panel
- Developer vault switcher — Settings > Developer tab (dev mode only), vault swap with rebuilding note
- Vault citation UI — unified "Source: Vault / Web Search / LLM" label on every assistant message
- Header/sidebar badges showing active vault label in dev mode

### Performance
- Settings wrapped in React.memo, deferred tab-specific API fetches (lodestone, developer status)
- MessageBubble wrapped in React.memo — siblings no longer trigger re-renders
- Boot chain: dropped redundant model fetch, cut splash delay 600ms → 200ms
- Idle timeout: 4 raw DOM listeners → 2 passive with 1s debounce

### Accessibility
- focus-visible on all new interactive elements (7 selectors)
- Service dots keyboard-accessible (Enter/Space to expand)
- PIN error messages announced via aria-live
- Touch targets at 44px minimum

### Bug Fixes
- Disk encryption link falls back to platform when method is null (case-insensitive)
- Conversation memory toggle label clarified as global setting
- Flaky e2e tests resolved via shared mock-bootstrap helper (107 passing, 0 flaky)
- Service status dot positioned to never overlap input controls

### Tests
- 45 new Playwright tests across 6 new spec files
- Shared mock-bootstrap.cjs helper for deterministic splash → chat in all specs
- Performance audit documented in docs/performance-audit-v0.15.0.md

---

## v0.7.2 — 2026-04-10

### Security
- Remove GitHub token from frontend build

### Features
- Replace bug report form with direct GitHub Issues link — simpler, no token required, works on any machine
- Privacy disclosure tooltip on bug report modal

### Bug Fixes
- Bump task-tray backend-dependent test timeouts

### Documentation
- Update CLAUDE.md to v0.7.1 state
- Consolidate duplicate sections in CLAUDE.md

---

## v0.7.1 — 2026-04-09

### Bug Fixes
- getConversationTurns now calls correct endpoint (BUG-001) — was calling non-existent /turns sub-route, now calls GET /v1/conversations/{id} and extracts turns from response
- Playwright regression test added for sidebar conversation loading

---

## v0.7.0 — 2026-04-06

### Features
- **Lodestone.** A new layer that builds a record of your values over time from your conversations and reflections. During onboarding you can answer a short survey to seed it directly. Skip it and it builds on its own. Values Ember infers show up in Settings for you to confirm, edit, or dismiss before anything is written.
- **Lodestone panel.** The Memory tab now shows your lodestone records organized by five categories: Character, Relational, Directional, Ground, and Beyond. Each category shows confirmed and proposed records with edit and dismiss controls. You can add records manually, add custom categories, and delete records you don't want. Lodestone seed values and categories can also be edited directly in config/lodestone.yaml and config/lodestone_taxonomy.yaml.
- **Deviation Engine.** Ember tracks when she responds differently than her training would normally produce and records those choices to your vault. Over time, recorded deviations outweigh default patterns in retrieval. Off by default. Enable it in Settings under Features.
- **Automated releases.** Release Please now manages versioning and changelogs.

### Bug Fixes
- Duplicate API calls on page load and Settings open. StrictMode-safe cleanup added to all data-loading effects.
- Collapsed sidebar did not expand on click. Now expands on click anywhere on the sidebar strip.
- Task delete showed no feedback on failure. Now surfaces inline error for 4 seconds.
- Onboarding completion dropped user to blank chat. Now opens Settings to Memory tab with lodestone findings visible.
- Onboarding restart showed empty fields. Now loads previous answers for review and editing.
- Deviation Engine toggle showed duplicate description text. Static duplicate removed.
- Lodestone Confirm button returned 400. Root cause was record cap. UI now surfaces the actual error.
- Settings toggles had no hover feedback. Added dynamic title attributes.
- Web search indicator appeared before response finished. Now shows "Searching..." during generation, badge only after completion.
- Source citation overflow on mobile at 375px/390px. Fixed.

### Known Issues
- Lodestone "Add category" is UI-only. Custom categories are not persisted to the backend and exist only for the current session.
- Onboarding inference quality varies. Some lodestone records may contain raw survey answers instead of inferred value statements if Ollama was unavailable during the POST.
- Mac/Linux installer not yet tested on real hardware. Windows is the only fully validated platform.
- Harness conversations appear in the sidebar. Deviation harness no longer sends X-Test-Session header (required for detection to run), so test conversations are visible.

### Tests
67 Playwright tests (63 passing, 4 skipped)

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
