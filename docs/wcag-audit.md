# WCAG 2.1 AA Accessibility Audit — ember-2-ui

**Date:** 2026-05-03
**Version audited:** v0.8.1
**Conformance target:** WCAG 2.1 Level AA
**Method:** Automated (axe-core via Playwright across 15 surfaces) + manual review of source for landmarks, form labels, focus management, semantic HTML, and theme contrast.

---

## Executive summary

ember-2-ui starts from a strong baseline. Focus management for modals (`src/hooks/useModal.js`), reduced-motion support at the OS and user level (`src/index.css:127-139`), 100% alt-text coverage on `<img>`, full keyboard reachability for the primary chat flow, and ~190 ARIA attributes across components all reflect deliberate accessibility work that predates this audit.

**Baseline scan (before fixes):** 12/15 surfaces passed. 3 blocking violations:

1. `chat-empty` — file `<input>` lacked an accessible name (CRITICAL)
2. `settings-features` — Context length `<select>` lacked an accessible name (CRITICAL)
3. `settings-security` — `.cloud-provider-not-configured` text contrast 3.37:1 vs WCAG AA's 4.5:1 minimum (SERIOUS)

**After fixes:** 15/15 surfaces pass. Full e2e suite (179 unrelated tests) shows no regressions caused by these changes (2 pre-existing backend-reachability `beforeEach` flakes in `style-packs.spec.cjs` and `task-tray.spec.cjs` are unaffected by a11y edits).

Beyond the 3 axe-blocking items, this pass also fixed several non-blocking-but-WCAG-relevant issues:
- Three `<span tabIndex={0} role="button">` info icons converted to real `<button>` elements (BugReport + Settings)
- 8 form `<label>` elements linked to their `<input>`/`<textarea>` via `htmlFor`/`id` (PinSetup, PinChange, Onboarding step 1 + step 3 — 19 textareas total in onboarding alone)
- Skip-to-content link added as the first focusable element on the chat surface; `<main>` now carries `id="main-content"`
- Focus-indicator suppression bug fixed (`.app-overflow-item:focus-visible { outline: none; }` → visible inset focus ring)
- Chat typing-indicator live region restructured: stable always-mounted `aria-live="polite" aria-atomic="true"` region replaces the conditionally-mounted `aria-label` pattern, so screen readers reliably announce status transitions (searching → verifying → analyzing)
- Recovery flow inputs in `LockScreen.jsx` got explicit `aria-label` (previously relied only on `placeholder`)

Remaining items in the deferred list need design judgment (Bloom-theme palette contrast tuning, ARIA tablist arrow-key navigation, keyboard discoverability copy, full-screen-flow heading hierarchy `<h2>` → `<h1>`) and are tracked for a follow-up pass — none are blocking the AA gate.

---

## Findings

Each finding lists: WCAG criterion → severity → location → fix → status.

Severities follow axe-core's impact scale: **Critical** (blocks task), **Serious** (significantly degrades), **Moderate** (noticeable to users of AT), **Minor** (cosmetic).

### 1.3.1 Info and Relationships (Level A)

| # | Severity | Location | Issue | Fix | Status |
|---|----------|----------|-------|-----|--------|
| 1.1 | Serious | `src/components/Chat/InputBar.jsx:137` | File `<input>` has no accessible name (only routed via wrapper button) | Added `aria-label="Attach files"` | ✅ FIXED |
| 1.2 | Serious | `src/components/Settings/Settings.jsx:1332` | "Context length" `<select>` had no `aria-label`; visible label not programmatically associated | Added `aria-label="Context length"` | ✅ FIXED |
| 1.3 | Serious | `src/components/LockScreen/LockScreen.jsx:107-128` | Recovery passphrase, new PIN, confirm PIN inputs relied on `placeholder` only | Added `aria-label` to each | ✅ FIXED |
| 1.4 | Serious | `src/components/LockScreen/PinSetup.jsx:114-159` | 4 inputs had visible `<label>` siblings without `htmlFor` linkage | Linked via `htmlFor` + `id` | ✅ FIXED |
| 1.5 | Serious | `src/components/LockScreen/PinChange.jsx:96-150` | 3 inputs across two forms had unlinked `<label>` siblings | Linked via `htmlFor` + `id` | ✅ FIXED |
| 1.6 | Serious | `src/components/Onboarding/Onboarding.jsx` (Step 1, Step 3) | 19 textareas had unlinked `<label>` siblings | Linked via `htmlFor` + `id`; wrapped each step's fields in `<form>` for semantic grouping | ✅ FIXED |

### 2.4.1 Bypass Blocks (Level A)

| # | Severity | Location | Issue | Fix | Status |
|---|----------|----------|-------|-----|--------|
| 2.1 | Moderate | `src/App.jsx` | No skip-to-content link; first Tab hits the sidebar's collapse button | Added visually-hidden skip link as first focusable element; `<main>` now carries `id="main-content"` | ✅ FIXED |

### 2.4.7 Focus Visible (Level AA)

| # | Severity | Location | Issue | Fix | Status |
|---|----------|----------|-------|-----|--------|
| 3.1 | Serious | `src/App.css:302-305` | `.app-overflow-item:focus-visible { outline: none; }` removed the focus ring on mobile overflow-menu items with no replacement | Replaced with `box-shadow: inset 0 0 0 2px var(--border-focus)` so focus stays visible | ✅ FIXED |

### 4.1.2 Name, Role, Value (Level A)

| # | Severity | Location | Issue | Fix | Status |
|---|----------|----------|-------|-----|--------|
| 4.1 | Serious | `src/components/BugReport/BugReport.jsx:21` | `<span tabIndex={0} role="button">` info icon — should be a real `<button>` so it gets correct keyboard activation (Space + Enter) and AT exposure | Converted to `<button type="button" class="bugreport-info-icon">`; uses existing `button` reset from `src/index.css:368-374` | ✅ FIXED |
| 4.2 | Serious | `src/components/Settings/Settings.jsx:1217` | Same pattern — web-search privacy info icon | Converted to `<button type="button">` | ✅ FIXED |
| 4.3 | Serious | `src/components/Settings/Settings.jsx:1355` | Same pattern — deviation engine info icon | Converted to `<button type="button">` | ✅ FIXED |

### 4.1.3 Status Messages (Level AA)

| # | Severity | Location | Issue | Fix | Status |
|---|----------|----------|-------|-----|--------|
| 5.1 | Moderate | `src/components/Chat/Chat.jsx:118-127` | Typing indicator's `aria-live="polite"` lived on a conditionally-mounted `<div>`. Mounting a live region after the page loads can cause AT to miss the first announcement; using `aria-label` on a live region also doesn't trigger updates when the label changes between status codes (searching → verifying → analyzing). | Lifted live region to a stable always-mounted `<div className="sr-only" aria-live="polite" aria-atomic="true">`; status text now lives in the region's text content, so changes are reliably announced | ✅ FIXED |

---

## Deferred items — not fixed in this pass

These are real findings, but each needs design judgment or a larger change than fits the "easy wins" pass. Listed here so the next round of a11y work has a clear queue.

### Color contrast (1.4.3 / 1.4.11)

- **Bloom (light) theme — text-muted on bg-surface** (`src/index.css:248-269`). `--text-muted: #9a8a95` on `--bg-surface: #f0eaed` lands near 3.0:1. WCAG AA needs 4.5:1 for body text and 3:1 for large text and UI components. Recommend darkening `--text-muted` to ~`#7a6a78` (≈4.7:1 on bg-surface) — or restrict its use to large text and decorative cases.
- **All themes — `--text-muted` for body copy**. Used in helper hints (`.settings-row-hint`, `.sidebar-empty`, `.app-vault-banner`). The `--text-secondary` token would meet AA in most themes; muted should be reserved for non-essential metadata.
- Action: dedicated palette pass with each theme verified via a contrast checker. Not done here because changes touch the theme system that user customization (`useTheme.js`) builds on.

### Keyboard discoverability (3.3 / general)

- The app supports `Ctrl+N`, `Ctrl+,`, `Ctrl+Shift+E`, and `Escape` (`src/App.jsx:196-225`). None are documented in-app — there's no keyboard-shortcut help panel. WCAG doesn't require this, but discoverability is poor.
- Action: add a "?" or `Ctrl+/` shortcut surface listing keybindings.

### ARIA tablist arrow-key navigation (4.1.2 enhancement)

- Settings tabs use `role="tab"` / `role="tablist"` / `role="tabpanel"` correctly. Per APG, `role="tablist"` should support Left/Right (or Up/Down) to move between tabs. Currently only Tab (which leaves the tablist) works.
- Action: add `useTabListKeyboard` hook for arrow-key cycling. Low priority — Tab still navigates, just not optimal.

### Heading hierarchy (1.3.1)

- Several screens use `<h2>` without an `<h1>` in the same document. The top-level `Ember-2` title in the header is `<h1>` (`src/App.jsx:372`), so the chat empty-state `<h2>` (`src/components/Chat/Chat.jsx:90, 97`) is correct under the actual hierarchy. But the `LockScreen`, `Onboarding`, and `PinSetup` full-screen flows replace the entire app and have only `<h2>` — they should bump to `<h1>` since no ancestor heading exists.
- Action: convert each full-screen flow's title from `<h2>` to `<h1>`.

### Streaming chat output announcement (4.1.3)

- The `role="log"` on `.chat-messages` means new messages are announced as they're added. This is correct for completed messages. Streaming token-by-token output is intentionally NOT announced — that would be unbearable for screen reader users.
- The fix in finding 5.1 above announces the high-level status (searching, verifying, etc.). When the response completes, the new message lands in the `role="log"` region and screen readers pick it up.
- No further action needed — current behavior is correct after fix 5.1.

### Tour and onboarding flow (multiple)

- Shepherd.js tour (`src/styles/tour.css`) has its own DOM and styling. axe-core scans don't cover it because it isn't visible during normal mocked-bootstrap tests. A dedicated test that triggers the tour and scans each step is worth adding.
- Action: add `tour.spec.cjs` exercising each tour step + axe scan.

---

## Tooling

### How to run the audit suite

The regression spec is `tests/e2e/a11y.spec.cjs`. It runs against the dev server (port 3000) like the rest of the e2e suite.

```powershell
# Run only the a11y spec (PowerShell, per CLAUDE.md)
npx playwright test tests/e2e/a11y.spec.cjs --reporter=list

# Run with the full suite
npx playwright test --workers=2
```

### How to interpret output

The harness fails the build only on `serious` and `critical` impact violations. `moderate` and `minor` findings print to the test log so the audit backlog is visible without breaking CI.

To re-baseline after intentional UI changes, read the printed `[a11y:<surface>]` blocks and decide whether each finding is a real regression or expected behavior. Update this document if you accept a new violation as an intentional tradeoff.

### What's NOT covered by automated scans

Axe is excellent at detecting structural issues (missing labels, role misuse, contrast ratios on rendered colors). It cannot detect:

- Whether ARIA labels are *meaningful* (e.g. "button" vs "Open settings menu")
- Cognitive accessibility (jargon, reading level, error message clarity)
- Focus order during dynamic interactions (modals, menus, toasts)
- Whether announcements actually reach a screen reader (live regions can be misconfigured in subtle ways)

For these, manual review with NVDA/VoiceOver/JAWS is required. The `Manual review` section below tracks what was checked manually in this pass.

---

## Verification

Ran with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001` because port 3000 was occupied by another local dev server during the audit; the spec is environment-agnostic and runs against whatever Vite-served URL is reachable.

| Step | Command | Result |
|------|---------|--------|
| Install | `npm install` (added `@axe-core/playwright`) | exit 0 |
| Baseline a11y scan | `npx playwright test tests/e2e/a11y.spec.cjs` | 12 passed, 3 failed (file input, context-length select, cloud-provider contrast) |
| Apply fixes (12 file edits) | — | — |
| Re-run a11y scan | `npx playwright test tests/e2e/a11y.spec.cjs` | **15 passed, 0 failed** |
| Full e2e suite | `npx playwright test --workers=2` | 179 passed, 2 pre-existing backend flakes (`style-packs.spec.cjs:47`, `task-tray.spec.cjs:147` — both `beforeEach` ECONNREFUSED on :8000), 1 flaky model-indicator (passed on retry), 4 conditional skips |
| Production build | `npm run build` | exit 0, dist copied to `ember-2/ui/` |

The 2 full-suite failures are infrastructure flakes in `beforeEach` hooks that hit the backend at `localhost:8000` during setup — the backend was intermittently unreachable during the audit. None of the failed tests touch components changed in this pass.

## Manual review notes

- **Keyboard sweep:** Tab-walked the chat surface (header → main → input → sidebar trigger → settings) — focus indicator visible at every stop after fix 3.1. Escape closes modals. Shift+Tab cycles backward correctly.
- **Skip link:** New skip link appears on first Tab from page load; activating jumps focus into `<main id="main-content">`.
- **Modal focus trap:** Settings, BugReport, Updates, About all trap focus correctly via `useModal` hook. Escape returns focus to triggering element.
- **Reduced motion:** OS preference and user override both kill animations as expected (`src/index.css:127-139`).
- **Bloom light theme:** Did not exercise via axe in this pass (default theme is Ember; theme switching is preference-driven and doesn't change axe-detectable structure). Bloom's `--text-muted` on `--bg-surface` is the highest-risk contrast pair and is flagged in the Deferred list.

---

## Source-of-truth files

- Regression spec: `tests/e2e/a11y.spec.cjs`
- This document: `docs/wcag-audit.md`
- Skip link styles: `src/index.css` (`.skip-link`, immediately after `:focus-visible`)
- Project a11y conventions: enforced via the spec; no ESLint integration in this pass (the project does not currently use ESLint — adding one is a separate initiative)

## Files touched in this pass

```
M  package.json                                  + @axe-core/playwright devDep
A  tests/e2e/a11y.spec.cjs                       new regression spec (15 tests)
A  docs/wcag-audit.md                            this document
M  src/App.jsx                                   skip link, id="main-content", tabIndex={-1} on <main>
M  src/App.css                                   .app-overflow-item focus indicator restored
M  src/index.css                                 .skip-link styles
M  src/components/Chat/Chat.jsx                  stable sr-only live region; aria-hidden on visual indicator
M  src/components/Chat/InputBar.jsx              file input aria-label
M  src/components/Settings/Settings.jsx          context-length select aria-label; 2x button conversion
M  src/components/Settings/Settings.css          cloud-provider-not-configured contrast fix
M  src/components/BugReport/BugReport.jsx        info icon span → button
M  src/components/LockScreen/LockScreen.jsx      recovery input aria-labels
M  src/components/LockScreen/PinSetup.jsx        4x label htmlFor + input id
M  src/components/LockScreen/PinChange.jsx       3x label htmlFor + input id
M  src/components/Onboarding/Onboarding.jsx      19x label htmlFor + textarea id; help button type="button"
```
