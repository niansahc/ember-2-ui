// Task 2 regression test — malformed conversation response handling.
//
// Root cause: getConversationTurns returned [] for missing turns key,
// which looked like a valid empty conversation, not a malformed response.
// This caused silent empty state when the API returned 200 but with
// invalid data structure.
//
// Fix: getConversationTurns now throws error if turns is not an array,
// so loadConversation can show an error instead of empty state.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const CONVO = {
  id: 'sess_badturn01',
  title: 'Conversation with Bad Response',
  updated_at: new Date().toISOString(),
  project_id: null,
}

const VALID_TURNS = [
  { id: 't1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
  { id: 't2', role: 'assistant', content: 'Hi there', timestamp: new Date().toISOString() },
]

test.describe('Conversation load with malformed response', () => {
  test('malformed response (missing turns key) shows error, not empty state', async ({ page }) => {
    await mockBootstrap(page, { conversations: [CONVO] })

    // Return 200 OK but missing the "turns" key — malformed
    await page.route(/\/conversations\/[^/?]+$/, async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}), // No "turns" key
      })
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const convo = page.locator('.sidebar-item').first()
    await convo.click()

    // Should show error, not silent empty state
    const errorBubble = page.locator('[data-testid="chat-error"]')
    await expect(errorBubble).toBeVisible({ timeout: 10000 })
  })

  test('valid response with turns array loads correctly', async ({ page }) => {
    await mockBootstrap(page, { conversations: [CONVO] })

    // Return proper response with turns array
    await page.route(/\/conversations\/[^/?]+$/, async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ turns: VALID_TURNS }),
      })
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const convo = page.locator('.sidebar-item').first()
    await convo.click()

    // Should load the conversation
    const bubbles = page.locator('.bubble')
    await expect(bubbles.first()).toBeVisible({ timeout: 10000 })
    await expect(bubbles).toHaveCount(VALID_TURNS.length)
  })
})
