# Changelog

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
