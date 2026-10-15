// mockBootstrap's catch-all: API calls no mock claims must be absorbed as a
// surfaced 404 instead of reaching the live backend (shared 60/min rate limit).
// See docs/e2e-vault-swap.md for the measurement behind this.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('mockBootstrap catch-all', () => {
  test('absorbs an unmocked API call as a 404 and records it', async ({ page }) => {
    const { unmocked } = await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    const before = unmocked.length
    const out = await page.evaluate(async () => {
      const r = await fetch('/v1/definitely-not-mocked')
      return { status: r.status, flag: r.headers.get('x-e2e-unmocked') }
    })
    expect(out).toEqual({ status: 404, flag: '1' })
    expect(unmocked.slice(before)).toEqual([{ method: 'GET', path: '/v1/definitely-not-mocked' }])
  })

  // Positive control for the test above: a mocked path must NOT be recorded,
  // otherwise "unmocked" would list everything and prove nothing.
  test('control: a mocked GET is not recorded and is served by its mock', async ({ page }) => {
    const { unmocked } = await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    const before = unmocked.length
    const out = await page.evaluate(async () => {
      const r = await fetch('/v1/preferences')
      return { status: r.status, flag: r.headers.get('x-e2e-unmocked') }
    })
    expect(out).toEqual({ status: 200, flag: null })
    expect(unmocked.slice(before)).toEqual([])
  })

  test('a non-GET to a mocked path falls through to the catch-all, not the network', async ({ page }) => {
    const { unmocked } = await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    const before = unmocked.length
    const status = await page.evaluate(async () => (
      await fetch('/v1/preferences', { method: 'PATCH', body: '{}' })
    ).status)
    expect(status).toBe(404)
    expect(unmocked.slice(before)).toEqual([{ method: 'PATCH', path: '/v1/preferences' }])
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
