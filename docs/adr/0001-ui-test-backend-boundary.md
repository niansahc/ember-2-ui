---
status: accepted
date: 2026-06-12
---

# 0001 — UI tests mock the API; backend-dependent specs are tagged, not CI-provisioned

## Context

ember-2-ui is the React/Vite frontend for Ember-2. It has no backend of its own —
it talks to the ember-2 FastAPI server. Our test suite is 100% Playwright e2e, and
many specs had grown a habit of skipping themselves at runtime when the backend was
slow, missing data, or not running Ollama (`test.skip(true, 'backend may be
unreachable…')`). A skip reads as green, so the suite was reporting "pass" while
real coverage silently evaporated — directly against our release gate that says a
flaky/condition-dependent test must be fixed or explicitly skip-with-condition
before shipping, and never carried forward.

The root question this forced: **what is the UI repo's test actually responsible
for proving?**

## Decision

We draw a hard boundary at the API:

1. **The default CI lane mocks the list/read endpoints** (`/v1/conversations`,
   `/v1/projects`, `/v1/tasks`, plus the existing bootstrap mocks) with synthetic
   fixtures. These tests prove **rendering and interaction against a known API
   contract** — does the sidebar render a conversation, does a failed delete roll
   back, does the context menu move it — with zero dependence on a live backend or
   real vault data. Synthetic fixtures only, per the Vault Privacy Rule.

2. **Specs that genuinely need a live backend** — Ollama-backed model
   switching/indicators, the task API round-trip, real conversation history — are
   **tagged `@needs-live-backend`** and excluded from the default lane via
   `grepInvert: /@needs-live-backend/` in `playwright.config.cjs`. They are run
   **manually before a release** (`npx playwright test --grep @needs-live-backend`),
   not on every push.

3. **We do not provision a backend in CI.** No booting ember-2, no pulling Ollama
   models, no seeding a vault in the UI repo's pipeline.

The explicit non-goal: the UI repo's default lane does **not** prove that the
backend honors its API contract. That is the backend repo's job, plus the
pre-release `@needs-live-backend` run and the scheduled cross-repo consistency
check.

## Considered options

- **Provision a full backend in CI** (boot ember-2 + Ollama + seeded vault so every
  category-C test runs for real on every push). *Rejected:* Ollama in CI is heavy
  and slow, it couples this repo's pipeline to the backend repo's runtime, and it's
  disproportionate for a frontend that should be testable in isolation.
- **Seed a real `test` vault via the API in global-setup.** *Rejected:* reintroduces
  a live-backend dependency for the very tests we want deterministic, is slower, and
  invites Vault Privacy edge cases. Mocking the GET responses gives the same UI
  coverage without writing anything.
- **Tag-and-exclude with no fixture seeding** (relabel all backend-touching tests
  `@needs-live-backend` and move on). *Rejected:* the data-only tests (sidebar
  projects, conversation-load) would stay un-run even though they can be made fully
  deterministic by mocking the list endpoints. We only tag what *truly* needs a
  backend.
- **Status quo — runtime conditional skips.** *Rejected:* this is the disease. A
  self-skipping test masks an infrastructure failure as a pass.

## Consequences

- The default lane becomes **green-by-construction**: only deterministic
  capability gates (e.g. "Vite dev server required for ESM import") may skip; zero
  backend skips, zero `test.fixme`.
- The real frontend↔backend round-trip is **not** exercised in the default lane.
  The accepted risk: if the backend changes a response schema, our mocks can drift
  and tests stay green while the app breaks. *Mitigation:* the pre-release
  `@needs-live-backend` run and the cross-repo consistency check are where drift is
  caught — and they are now the documented place to look, instead of being implicit.
- "Acceptable skip" now has a written definition (see CLAUDE.md Testing
  Discipline), so the count stops drifting release to release.
