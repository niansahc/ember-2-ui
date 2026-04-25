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

Version: v0.7.4 (published). 163 Playwright tests, 2 conditional skips. Settings redesign, onboarding flow, lodestone panel, vault citations, service status indicator, Change PIN flow, disk encryption status, and developer vault switcher all shipped. This repo produces the static build served by the ember-2 FastAPI backend.

---

## Key Components

These exist and must not be re-implemented:

- Streaming chat with markdown rendering (ReactMarkdown + remark-gfm)
- Shepherd.js guided first-run tour (6 steps, triggers once via preferences API)
- Task sidebar tray (bottom-anchored, checkbox to complete, 30s polling)
- Conversational style selector (Casual/Balanced/Thoughtful card selector in Settings)
- PIN/passphrase lock screen with idle timeout and recovery
- Multi-image upload — select and send multiple images in a single message
- Unified source attribution label on assistant messages (Source: Web Search / Vault / Vision)
- Service status indicator -- breathing dot with hover panel for restart/shutdown
- Change PIN flow in Settings > Security (verify current, enter new, confirm)
- Disk encryption status in Settings > Security with platform-appropriate docs link
- Developer vault switcher in Settings > Developer tab (dev mode only)
- Launch Installer button in Settings > About tab
- Session restore on page refresh via localStorage
- PWA manifest for Android/iOS home screen installation
- Full-page tabbed Settings (General, Security, Memory, Features, About)
- Onboarding flow (4-step: profile, lodestone gate, lodestone questionnaire, lodestone review)
- Lodestone panel in Memory tab (5 taxonomy categories, per-record edit/dismiss/confirm)
- Deviation Engine toggle in Features tab
- Bare mode per-conversation toggle (flame/X icon in chat header, strips personality)
- Vault storage display in Settings Memory tab (current size + 30-day projection)

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

- React 19
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
- Use TodoWrite and TodoRead tools to maintain a visible task list for every multi-step task. Update it as work completes.

---

## Release Process

### Gates -- mandatory before any release or patch is cut

**Documentation gate (all three repos):**
- [ ] CLAUDE.md version and test count current
- [ ] TDD updated to reflect what shipped (G only)
- [ ] README reflects current features
- [ ] CHANGELOG.md current (release-please handles via commits)

**Quality gate:**
- [ ] All tests passing
- [ ] Retrieval eval passing with no regression (G only)
- [ ] No flaky tests carried forward

**Coordination gate:**
- [ ] All three repos confirm docs and tests green
- [ ] Human approves before any tag is created
- [ ] GitHub Release not created until human says go

### Sequence

1. G, M, Y each complete documentation and quality gates
2. Each reports green to manager
3. Manager confirms all three green and gets human approval
4. G coordinates the release -- tags all three repos, creates GitHub Releases
5. Y attaches installer artifacts (.exe, latest.yml)
6. G verifies all three releases are publicly visible
7. G reports release URLs -- release is not done until this step

### Y independent releases

Y may cut an installer-only release when:
- Changes are installer-specific only (no backend or UI updates)
- Human explicitly approves
- Y completes documentation and quality gates independently
- Y tags, creates GitHub Release, attaches artifacts, and reports URL

Y does NOT cut independent releases when backend or UI changes are involved -- coordinate with G.

### release-please

All three repos use release-please for automated release PRs. Conventional commits are required. Release PRs require human approval before merging.

---

## Git Hooks (business hours push protection)

Blocks pushes during US Eastern business hours (9am-5pm Mon-Fri). Two layers:

1. **Local pre-push hook** — `hooks/pre-push`. Git hooks are not committed, so install manually after cloning:
   ```bash
   cp hooks/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push
   ```

2. **GitHub Actions check** — `.github/workflows/business-hours-check.yml`. Fails the push workflow if the push arrived during business hours.

Hook handles EST/EDT automatically via Python's `zoneinfo`.

---

## Hooks

Configured in `.claude/settings.json` (project-level, committed to repo).

**PreToolUse — .env file protection:**
Blocks any Edit or Write to files matching `.env*`. Returns a `decision: block` response. No exceptions — secrets stay out of version control artifacts.

**PostToolUse — Playwright test runner:**
After any Edit or Write to `src/**/*.{jsx,js,css}`, runs `npx playwright test --workers=2` via PowerShell asynchronously in the background. Does not block editing. Skips non-source files (docs, config, tests). Timeout: 5 minutes.

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
