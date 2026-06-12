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
// Per-test overrides are spread-merged onto the defaults:
//   await mockBootstrap(page, {
//     preferences: { onboarding_complete: false },               // first-run path
//     preferences: {                                             // named greeting
//       onboarding_profile_answers: { identity: 'Alex, they/them' },
//     },
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
    // Identity drives the personalized-greeting name extraction in Chat.jsx.
    // Defaults to null (returning user, no name) so existing tests that
    // didn't stub this field see the same behavior as before. Override via
    // `preferences: { onboarding_profile_answers: { identity: '...' } }`.
    onboarding_profile_answers: { identity: null },
    ...overrides.preferences,
  }

  const pinStatus = {
    pin_set: false,
    ...overrides.pinStatus,
  }

  // List endpoints — default to empty so the sidebar renders deterministically
  // with no live backend. Per ADR 0001, the UI's default lane proves rendering
  // against a known contract using synthetic fixtures (Vault Privacy Rule).
  // Override per-test:
  //   conversations: [{ id, title, updated_at, project_id }]
  //   projects:      [{ id, name, color, conversation_count }]
  //   tasks:         { active: [...], proposed: [...] }
  const conversations = overrides.conversations || []
  const projects = overrides.projects || []
  const tasks = overrides.tasks || { active: [], proposed: [] }

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

  // GET /v1/conversations?limit=... — the list (has a query string). Scoped to
  // GET and to the bare collection path so /conversations/{id} (turns, rename,
  // delete) still flows through to a per-test route or the real backend.
  await page.route(/\/conversations(\?|$)/, async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ conversations }),
    })
  })

  // GET /v1/projects — POST (createProject) still hits the backend.
  await page.route(/\/projects$/, async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects }),
    })
  })

  // GET /v1/tasks?status=... — returns the list for the requested status;
  // PATCH/DELETE on /tasks/{id} still flow through.
  await page.route(/\/tasks(\?|$)/, async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    const status = new URL(request.url()).searchParams.get('status')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tasks: tasks[status] || [] }),
    })
  })
}

module.exports = { mockBootstrap }
