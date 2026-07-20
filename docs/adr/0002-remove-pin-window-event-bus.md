# ADR 0002 — Remove the PIN window-event bus via explicit props, not a Context

- Status: Accepted
- Date: 2026-07-20
- Relates to: issue #22 (App.jsx refactor), Stage 2. Builds on Stage 1 (PR #34, AppearanceContext).

## Context

`App.jsx` used two payload-less `window` `Event` signals as an ad-hoc bus so the
Settings modal could ask the root App to open the PIN flows:

- `ember-show-pin-setup` — dispatched from `Settings.jsx`, heard in `App.jsx` → `setShowPinSetup(true)`
- `ember-show-pin-change` — dispatched from `Settings.jsx`, heard in `App.jsx` → `setShowPinChange(true)`

Issue #22's written acceptance said to "replace the window-event bus with
**context callbacks**" and named a `SettingsContext`. That text was written before
anyone confirmed the component tree.

On inspection, `Settings` is a **direct child of App**, and both dispatches live
inline in Settings' own render body. There is no intermediate component and no
prop-drilling: a callback prop from App lands exactly where the event fired.

## Decision

Replace the two signals with two explicit callback props on `Settings` —
`onRequestPinSetup` and `onRequestPinChange` — wired in App to the existing
`setShowPinSetup` / `setShowPinChange` state setters. **No Context is introduced
in this stage.**

## Rationale

Stage 1 (ADR-less, but recorded in PR #34) established the governing principle:
gather genuine god-object prop-drilling into a Context, but do **not** over-split —
one-level parent→child composition (e.g. `StylePackPicker`'s prop slice) is
legitimate and was deliberately left on props.

A Context whose entire payload is two callbacks handed to a direct child is exactly
that over-split. Explicit props are the lighter, more honest fit and still satisfy
the durable acceptance criterion: **"No window CustomEvent bus for intra-app
signalling."** Any new Context is deferred to Stage 3 (the boot/lock/onboarding
state machine), where it earns its keep.

## Consequences

- The trigger surface narrows from "anything on the page" (a global `window`
  event) to "the Settings component." Only Settings dispatched these today, so no
  capability is lost. A future non-Settings trigger would wire its own path in App.
- Issue #22's acceptance text ("context callbacks") is amended by this ADR; the
  GitHub issue should be updated to read "explicit props where the dispatcher is a
  direct child" (pending owner approval).
- Coverage: `pin-change.spec.cjs` already asserts the Change-PIN button opens its
  overlay; `pin-setup-from-settings.spec.cjs` was added to assert the same for the
  Set-up-PIN button, closing the pre-existing asymmetry.

## Alternatives considered

- **`SettingsContext` for the two callbacks** — rejected as the over-split above.
- **Cohesive `SettingsActionsContext`** gathering all ~6 Settings→App action
  callbacks (`onOpenBugReport`, `onOpenUpdates`, `onOpenAbout`, `onModelChange`, plus
  the two PIN callbacks) — defensible and mirrors AppearanceContext, but larger than
  Stage 2's scope and not required to remove the bus. Left as a candidate for a
  future stage.
