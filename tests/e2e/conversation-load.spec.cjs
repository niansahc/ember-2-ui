// BUG-001 regression test — clicking a sidebar conversation must populate
// the chat area. Previously the UI called a non-existent /turns sub-route
// and silently returned an empty list.
//
// Per ADR 0001 this runs in the default lane against mocked endpoints: the
// conversation list and its turns are synthetic fixtures (Vault Privacy Rule),
// so the test is deterministic and needs no live backend. The regression is
// still caught — if the UI fetched the wrong sub-route, the turns mock would
// never match and no bubble would render.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const CONVO = {
  id: 'sess_convoload01',
  title: 'Synthetic Conversation',
  updated_at: new Date().toISOString(),
  project_id: null,
}

const TURNS = [
  { id: 't1', role: 'user', content: 'Hello there', timestamp: new Date().toISOString() },
  { id: 't2', role: 'assistant', content: 'General Kenobi', timestamp: new Date().toISOString() },
]

test.describe('Conversation loading (BUG-001)', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page, { conversations: [CONVO] })
    // GET /v1/conversations/{id} — the turns for the synthetic conversation.
    // Registered after mockBootstrap so it wins for the per-conversation path.
    await page.route(/\/conversations\/[^/?]+$/, async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ turns: TURNS }),
      })
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('clicking a sidebar conversation populates the chat area', async ({ page }) => {
    const firstConvo = page.locator('.sidebar-item').first()
    await expect(firstConvo).toBeVisible()
    await firstConvo.click()

    // Chat area populates with the mocked turns.
    const bubbles = page.locator('.bubble')
    await expect(bubbles.first()).toBeVisible({ timeout: 10000 })
    await expect(bubbles).toHaveCount(TURNS.length)
    await expect(page.locator('.bubble', { hasText: 'General Kenobi' })).toBeVisible()
  })
})
