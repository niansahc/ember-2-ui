// @ts-check
const { defineConfig } = require('@playwright/test')

// baseURL default is :3000 (Vite dev server) so tests hit live branch code
// via HMR. Auto-started below via `webServer`. To test against the deployed
// build served by the FastAPI backend on :8000, set PLAYWRIGHT_BASE_URL —
// the webServer block only matters when :3000 is the target.
module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.cjs',
  timeout: 30000,
  retries: 1,
  // Default lane excludes @needs-live-backend specs (Ollama / live model
  // round-trips) so CI stays green-by-construction with no backend. Per ADR
  // 0001, run those before a release with:
  //   $env:EMBER_LIVE_BACKEND=1; npx playwright test --grep @needs-live-backend
  grepInvert: process.env.EMBER_LIVE_BACKEND ? undefined : /@needs-live-backend/,
  globalSetup: require.resolve('./tests/e2e/global-setup.cjs'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.cjs'),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Auto-start Vite dev server unless one is already running. reuseExistingServer
  // is true locally (for fast iteration) and false on CI (each run gets a clean
  // server). Skipped entirely when PLAYWRIGHT_BASE_URL is set to :8000 or similar.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
