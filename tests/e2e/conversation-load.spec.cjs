// BUG-001 regression test — clicking a sidebar conversation must populate
// the chat area. Previously the UI called a non-existent /turns sub-route
// and silently returned an empty list.
//
// Requires Ember API running at localhost:8000 (start_api.bat) AND at least
// one existing conversation in the vault. Skips gracefully if none found.

const { test, expect } = require('@playwright/test')

test.describe('Conversation loading (BUG-001)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('clicking a sidebar conversation populates the chat area', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    const firstConvo = sidebar.locator('.sidebar-item').first()

    try {
      await firstConvo.waitFor({ state: 'visible', timeout: 5000 })
    } catch {
      test.skip(true, 'No existing conversations in vault — backend-dependent fixture required')
      return
    }

    await firstConvo.click()

    // Chat area must populate with at least one message bubble.
    const firstBubble = page.locator('.bubble').first()
    await expect(firstBubble).toBeVisible({ timeout: 10000 })
  })
})
