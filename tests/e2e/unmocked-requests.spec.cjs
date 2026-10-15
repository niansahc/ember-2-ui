// mockBootstrap's catch-all: API calls no mock claims must be absorbed as a
// surfaced 404 instead of reaching the live backend (shared 60/min rate limit).
// See docs/e2e-vault-swap.md for the measurement behind this.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

// Boot the app under mockBootstrap and return the unmocked list plus a probe
// that fires one fetch from the page and reports what the catch-all recorded
// for it alone (boot-time calls are excluded).
async function boot(page) {
  const { unmocked } = await mockBootstrap(page)
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  return {
    unmocked,
    async probe(path, init) {
      const before = unmocked.length
      const out = await page.evaluate(async ([p, i]) => {
        const r = await fetch(p, i)
        return { status: r.status, flag: r.headers.get('x-e2e-unmocked') }
      }, [path, init])
      return { ...out, recorded: unmocked.slice(before) }
    },
  }
}

test.describe('mockBootstrap catch-all', () => {
  for (const { name, path, init, method } of [
    { name: 'an unmocked GET', path: '/v1/definitely-not-mocked', init: undefined, method: 'GET' },
    // A non-GET to a mocked path: the mock calls route.fallback(), which must
    // land on the catch-all, not the network.
    { name: 'a non-GET to a mocked path', path: '/v1/preferences', init: { method: 'PATCH', body: '{}' }, method: 'PATCH' },
  ]) {
    test(`absorbs ${name} as a 404 and records it`, async ({ page }) => {
      const app = await boot(page)
      expect(await app.probe(path, init)).toEqual({
        status: 404, flag: '1', recorded: [{ method, path }],
      })
    })
  }

  // Positive control for the tests above: a mocked path must NOT be recorded,
  // otherwise "unmocked" would list everything and prove nothing.
  test('control: a mocked GET is not recorded and is served by its mock', async ({ page }) => {
    const app = await boot(page)
    expect(await app.probe('/v1/preferences')).toEqual({ status: 200, flag: null, recorded: [] })
  })

  test('a spec-level mock registered after mockBootstrap still wins', async ({ page }) => {
    const { unmocked } = await mockBootstrap(page)
    await page.route('**/v1/developer/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"dev_mode":false}' }))
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    const status = await page.evaluate(async () => (await fetch('/v1/developer/status')).status)
    expect(status).toBe(200)
    expect(unmocked.some((u) => u.path === '/v1/developer/status')).toBe(false)
  })
})
