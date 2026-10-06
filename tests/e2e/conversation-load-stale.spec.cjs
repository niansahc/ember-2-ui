// Stale conversation loads must not overwrite a newer selection.
//
// Click A (slow response), then B (fast response). B renders first; when A's
// response finally lands it must be discarded, not painted over B. Same for
// "New conversation" clicked while a load is in flight.
//
// The "A never appears" checks are absence assertions, so they wait for A's
// response to actually arrive before asserting, and the file carries a
// positive control: A on its own, through the same slow route, does render.
// All content is synthetic (Vault Privacy Rule).

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const now = new Date().toISOString()
const SLOW = { id: 'sess_staleslow0001', title: 'Synthetic slow conversation', updated_at: now, project_id: null }
const FAST = { id: 'sess_stalefast0001', title: 'Synthetic fast conversation', updated_at: now, project_id: null }
const SLOW_DELAY_MS = 1500

function body(id, text) {
  return JSON.stringify({
    session: { id, title: 'Synthetic', created_at: '2026-10-01T12:00:00+00:00' },
    turns: [{ id: `${id}-t1`, role: 'user', content: text, timestamp: '2026-10-01T12-00-01-000001' }],
  })
}

async function setup(page) {
  await mockBootstrap(page, { conversations: [SLOW, FAST] })
  await page.route(/\/conversations\/[^/?]+$/, async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    if (request.url().endsWith(SLOW.id)) {
      await new Promise((r) => setTimeout(r, SLOW_DELAY_MS))
      return route.fulfill({ status: 200, contentType: 'application/json', body: body(SLOW.id, 'Synthetic slow turn') })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: body(FAST.id, 'Synthetic fast turn') })
  })
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
}

const row = (page, convo) => page.locator('.sidebar-item', { hasText: convo.title })
const slowResponse = (page) => page.waitForResponse((r) => r.url().endsWith(SLOW.id))

test.describe('Stale conversation loads', () => {
  test('positive control: the slow conversation renders when nothing supersedes it', async ({ page }) => {
    await setup(page)
    const slowDone = slowResponse(page)
    await row(page, SLOW).click()
    await slowDone
    await expect(page.locator('.bubble', { hasText: 'Synthetic slow turn' })).toBeVisible()
  })

  test('a slow load for A does not overwrite a later selection of B', async ({ page }) => {
    await setup(page)
    const slowDone = slowResponse(page)
    await row(page, SLOW).click()
    await row(page, FAST).click()
    await expect(page.locator('.bubble', { hasText: 'Synthetic fast turn' })).toBeVisible({ timeout: 10000 })

    await slowDone
    // Give React a beat to apply A's response if the guard is missing.
    await page.waitForTimeout(300)
    await expect(page.locator('.bubble', { hasText: 'Synthetic slow turn' })).toHaveCount(0)
    await expect(page.locator('.bubble', { hasText: 'Synthetic fast turn' })).toBeVisible()
  })

  test('a slow load does not overwrite a new conversation started after it', async ({ page }) => {
    await setup(page)
    const slowDone = slowResponse(page)
    await row(page, SLOW).click()
    // Sidebar closes on select on narrow viewports; the top-level button is
    // the first "New conversation" control either way.
    await page.getByRole('button', { name: 'New conversation' }).first().click()

    await slowDone
    await page.waitForTimeout(300)
    await expect(page.locator('.bubble', { hasText: 'Synthetic slow turn' })).toHaveCount(0)
    await expect(page.locator('.chat-empty')).toBeVisible()
  })
})
