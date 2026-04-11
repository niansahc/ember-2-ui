# CLAUDE.md — ember-2-ui

## Repo Identity
This is ember-2-ui — the React/Vite frontend for Ember-2. Tab color: MAGENTA.
If you are not in C:\Users\nians\OneDrive\Desktop\Ember-2\ember-2-ui, stop and check.

---

## What This Repo Is

The Ember-2 custom UI. Built with React and Vite. Served by the ember-2 FastAPI backend from the ui/ folder after build.

This repo produces a static build that gets copied into ember-2/ui/. It is not a standalone app — it requires the ember-2 backend to function.

---

## Current State

Version: v0.7.1 (published). 62 Playwright tests passing, 3 skipped. BUG-001 (sidebar conversation links) fixed in v0.7.1. Settings redesign, onboarding flow, and lodestone panel shipped. This repo produces the static build served by the ember-2 FastAPI backend.

---

## Key Components

These exist and must not be re-implemented:

- Streaming chat with markdown rendering (ReactMarkdown + remark-gfm)
- Shepherd.js guided first-run tour (6 steps, triggers once via preferences API)
- Task sidebar tray (bottom-anchored, checkbox to complete, 30s polling)
- Conversational style selector (Casual/Balanced/Thoughtful card selector in Settings)
- PIN/passphrase lock screen with idle timeout and recovery
- Multi-image upload — select and send multiple images in a single message
- Web search transparency indicator (magnifying glass icon on messages that used web search)
- Session restore on page refresh via localStorage
- PWA manifest for Android/iOS home screen installation
- Full-page tabbed Settings (General, Security, Memory, Features, About)
- Onboarding flow (4-step: profile, lodestone gate, lodestone questionnaire, lodestone review)
- Lodestone panel in Memory tab (5 taxonomy categories, per-record edit/dismiss/confirm)
- Deviation Engine toggle in Features tab

---

## Rules

- Do not modify the build output in ember-2/ui/ directly — always build from source
- Do not store sensitive data in localStorage beyond session IDs and UI preferences
- Do not hardcode API URLs — use the Vite proxy config
- Do not use axios — use native fetch
- Mobile must work — test viewport behavior for any UI changes
- Do not use the word "shape" in any output

---

## Tech Stack

- React 18
- Vite
- Playwright (e2e tests)
- No axios — native fetch only

---

## Test Commands

**WARNING: Playwright MUST be run in PowerShell — NOT bash. The bash runner does not support the browser environment. This is the most common source of test failures.**

```bash
# Run e2e tests (must be run in PowerShell, not bash)
npx playwright test

# Run with reduced workers to avoid crashing the API
npx playwright test --workers=2

# Build for production
npm run build

# Dev server
npm run dev
```

### Testing Discipline

When a flaky or condition-dependent test is identified during a release cycle, it must be fixed or marked skip-with-condition before that release ships. Flaky tests do not carry forward to the next release. A test that sometimes passes and sometimes fails is not passing — it is broken and must be resolved before the release gate is met.

---

## UI Design Gates

**Internal fields never reach the user directly.**
Database field names, taxonomy category keys, acquisition path values, source tags, and any other internal classification terms must never be rendered as user-facing labels. All user-facing display strings must be explicitly defined before UI implementation begins.

**Taxonomy display names must be approved before UI work starts.**
If a feature introduces taxonomy categories, types, or classifications, the user-facing display name and description for each must be documented and approved in the ADR or feature spec before M writes any UI code. Internal key names (e.g. "ground", "character", "onboarding") are not display names.

**UI must be built against clean data.**
Do not build or review UI against broken, partial, or pre-inference data. If the backend is not ready, M mocks clean data to spec. Real data is only connected after it meets the expected schema.

**Design before implementation.**
For any panel or view that surfaces user data, the information architecture (what the user sees, in what order, what each element means) must be described and approved in this chat before M builds it. Prompts that skip this step will be sent back.

---

## Vault Privacy Rule

Vault contents — including names, conversation text, and record IDs — must never appear in code, tests, commits, scripts, or docs. This rule has no exceptions. If a test requires memory data, use synthetic fixture data only.

---

## Working Conventions

- Small, frequent commits with clear messages
- Commit before moving to next item
- No releasing until the human says so
- Component changes should not break mobile
- If the human says PAUSE — stop and reorient
- If the human says STOP — drop the topic entirely

---

## Release Checklist

**Critical principle: CC runs the full release process. Nothing is "done" until it is publicly downloadable. Never assume the human is cutting the release unless they explicitly say so.**

A release is not complete at commit. A release is not complete at tag. A release is complete when:
- The GitHub Release is published (not draft)
- Artifacts are attached (installer .exe / source)
- latest.yml is present in release assets (installer only)
- The release is visible and downloadable at the GitHub Releases URL
- CC has verified the above and reported the URL

### Pre-release (run before every release)

**ember-2 (backend):**
- [ ] All tests passing: pytest tests/
- [ ] Retrieval eval passing: python tools/eval_retrieval.py -- no regression
- [ ] Conversation eval run: python tools/eval_conversations.py -- document results
- [ ] CHANGELOG.md updated
- [ ] version.json bumped
- [ ] All changes committed and pushed to main: git push origin main
- [ ] Constitution, nature, and Lodestone layers reviewed for coherence
- [ ] Research review: any watch items ready to graduate to roadmap?

**ember-2-ui (frontend, current: v0.7.1):**
- [ ] All Playwright tests passing: npx playwright test --workers=2
- [ ] CHANGELOG.md updated
- [ ] package.json version bumped
- [ ] All changes committed and pushed to main: git push origin main
- [ ] UI rebuilt from correct source: npm ci && npm run build

**ember-2-installer (installer):**
- [ ] All Playwright tests passing
- [ ] CHANGELOG.md updated
- [ ] package.json version bumped
- [ ] All changes committed and pushed to main: git push origin main
- [ ] Frontend freshly built from pinned ember-2-ui tag before packaging
- [ ] Backend version pinned and documented in release notes
- [ ] Installer built: npm run dist
- [ ] app-update.yml present in dist/win-unpacked/resources/ -- verify before publishing
- [ ] latest.yml will be attached to release by electron-builder -- verify after publishing

### Release (CC runs this, not the human)

- [ ] Git tag created: git tag vX.X.X
- [ ] Tag pushed: git push origin vX.X.X
- [ ] GitHub Release created (NOT draft): gh release create vX.X.X --title "vX.X.X" --notes "..." --latest
- [ ] Artifacts attached to release (installer .exe for yellow, source zip for green)
- [ ] Release verified as published and visible: gh release view vX.X.X
- [ ] Release URL reported to human: https://github.com/niansahc/ember-2-ui/releases/tag/vX.X.X

### Post-release verification (CC runs this)

- [ ] Confirm release appears at https://github.com/niansahc/ember-2-ui/releases
- [ ] Confirm latest.yml is present in release assets (installer only)
- [ ] Confirm version matches package.json / version.json
- [ ] Report to human: "Release vX.X.X is live at [URL]. Users can download/update now."

### Patch releases

Patch releases follow the same checklist. There are no shortcuts for patches. A patch that is committed but not published is not a patch -- it is unpublished work. Every patch must complete the full release process before being called done.

---

## Claude Code Efficiency Rules

**Parallel subagents — use them.**
Any task touching 3+ independent files or with clearly separable subtasks must use parallel subagents. Do not work sequentially when work can be fanned out. Spawn subagents, merge results.

**Hooks — always active:**
- Auto-run tests after any code edit (pytest for G, npm run test:e2e for M and Y)
- Auto-reject any changes to private_vault/ or .env files

**Scheduled tasks:**
- Weekly dependency audit — flag outdated or vulnerable packages in requirements.txt / package.json
- Pre-release cross-repo consistency check — verify UI matches backend API responses before any release

**Session naming:**
- Always name sessions descriptively, e.g. claude -n "vault-citation-backend"
  Enables resumption with full context.

---

## Repo Color
MAGENTA — ember-2-ui (React frontend)
