# CLAUDE.md — ember-2-ui

## Repo Identity
This is ember-2-ui — the React/Vite frontend for Ember-2. Tab color: MAGENTA.
If you are not in C:\Users\nians\OneDrive\Desktop\Ember-2\ember-2-ui, stop and check.

---

## What This Repo Is

The Ember-2 custom UI. Built with React and Vite. Served by the ember-2 FastAPI backend from the ui/ folder after build.

This repo produces a static build that gets copied into ember-2/ui/. It is not a standalone app — it requires the ember-2 backend to function.

---

## Core Rules

- Do not hardcode API URLs — use the Vite proxy config
- Do not use axios — use native fetch
- Do not store sensitive data in localStorage beyond session IDs and UI preferences
- Do not modify the build output in ember-2/ui/ directly — always build from source
- Mobile must work — test viewport behavior for any UI changes

---

## Tech Stack

- React 18
- Vite
- Playwright (e2e tests)
- No axios — native fetch only

---

## Test Commands
```bash
# Run e2e tests (must be run in PowerShell, not bash)
npx playwright test

# Build for production
npm run build

# Dev server
npm run dev
```

Playwright tests must be run manually in PowerShell. The bash runner does not support the browser environment required.

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

- [ ] All Playwright tests passing (run manually in PowerShell)
- [ ] Mobile tested
- [ ] No uncommitted changes
- [ ] CHANGELOG.md updated
- [ ] version bumped in package.json
- [ ] Git tag created

---

## Repo Color
MAGENTA — ember-2-ui (React frontend)
