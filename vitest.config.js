import { defineConfig } from 'vitest/config'

// Node-only unit layer for pure utilities and the mock API. Kept separate
// from the Playwright e2e suite (browser/DOM) — this lane never touches
// jsdom or React. include is scoped to *.test.js under src/ so e2e .cjs
// specs are never picked up here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
