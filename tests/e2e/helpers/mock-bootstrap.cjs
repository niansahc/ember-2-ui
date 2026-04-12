// Shared bootstrap mocks for Playwright e2e tests.
//
// Why this exists: the app's splash → chat transition depends on a handshake
// with the backend (/api/health, /model) plus a preferences + PIN status
// check. Under parallel worker load, the backend sometimes responds slowly
// enough that tests racing against a 15s .app-layout wait time out. This
// helper registers page.route() handlers for the bootstrap endpoints so the
// transition is instant and deterministic in tests that don't need real
// backend data.
//
// Usage:
//   const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')
//   test.beforeEach(async ({ page }) => {
//     await mockBootstrap(page)     // MUST be before page.goto
//     await page.goto('/')
//     await page.waitForSelector('.app-layout', { timeout: 15000 })
//   })
//
// For tests that DO need real backend data (e.g. model switch flows),
// put them in a separate test.describe with its own beforeEach that skips
// mockBootstrap.

async function mockBootstrap(page, overrides = {}) {
  const health = {
    status: 'ok',
    version: '0.14.1',
    model: 'qwen3:8b',
    ...overrides.health,
  }

  const modelInfo = {
    model: 'qwen3:8b',
    // Backend returns this as a flat array of model name strings (see
    // mock.js mockGetOllamaModels and the real /model endpoint). Settings
    // calls .toLowerCase() on each entry, so objects here would crash.
    available: ['qwen3:8b', 'llama3.2:3b'],
    vision_model: null,
    ...overrides.model,
  }

  const preferences = {
    first_run_tour_complete: true,
    onboarding_complete: true,
    pin_setup_dismissed: true,
    lock_on_launch: false,
    idle_lock_enabled: false,
    idle_timeout: 15,
    conversational_style: 'balanced',
    deviation_enabled: false,
    web_search_autonomous: false,
    ...overrides.preferences,
  }

  const pinStatus = {
    pin_set: false,
    ...overrides.pinStatus,
  }

  // /api/health — splash handshake + sidebar version fetch
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(health),
    })
  })

  // /model — App.jsx reads model name + available list for Settings
  // Scoped to GET only so POST /model (model switch) still hits the backend.
  await page.route('**/model', async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    // Guard against accidentally matching unrelated URLs that happen to
    // end in /model (e.g. /v1/some-model) — only the exact bare /model
    // path, optionally with a trailing slash or query string.
    const url = new URL(request.url())
    if (!/\/model\/?$/.test(url.pathname)) return route.continue()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(modelInfo),
    })
  })

  // /v1/preferences — GET only, so PATCH can still hit real backend if a
  // test needs to exercise preference writes
  await page.route('**/v1/preferences', async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(preferences),
    })
  })

  // /v1/security/pin/status — GET only
  await page.route('**/v1/security/pin/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pinStatus),
    })
  })
}

module.exports = { mockBootstrap }
