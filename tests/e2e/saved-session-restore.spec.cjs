// Saved-session restore when the conversation is gone.
//
// On boot, App restores `ember_active_session` from localStorage and loads it.
// If that conversation was deleted, GET /v1/conversations/{id} returns 404.
// The saved ID must be cleared and the app must fall back to a blank chat;
// otherwise every reload re-requests a conversation that no longer exists.
//
// "No error turn" and "saved ID removed" are absence assertions, so the file
// carries a positive control: a transient 500 on the same path still shows the
// error turn and keeps the saved ID (the conversation may well still exist).
// All IDs are synthetic (Vault Privacy Rule).

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const SAVED_ID = 'sess_restoregone001'

async function bootWithSavedSession(page, status) {
  await mockBootstrap(page)
  await page.addInitScript((id) => {
    try { localStorage.setItem('ember_active_session', id) } catch {}
  }, SAVED_ID)
  const loaded = page.waitForResponse((r) => r.url().endsWith(`/conversations/${SAVED_ID}`))
  await page.route(/\/conversations\/[^/?]+$/, async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'synthetic' }),
    })
  })
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  await loaded
}

const savedId = (page) => page.evaluate(() => localStorage.getItem('ember_active_session'))

test.describe('Saved session restore', () => {
  test('a deleted saved session (404) clears the saved ID and shows a blank chat', async ({ page }) => {
    await bootWithSavedSession(page, 404)

    await expect(page.locator('.chat-empty')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="chat-error"]')).toHaveCount(0)
    await expect.poll(() => savedId(page)).toBeNull()
  })

  test('positive control: a transient failure (500) shows the error and keeps the saved ID', async ({ page }) => {
    await bootWithSavedSession(page, 500)

    await expect(page.locator('[data-testid="chat-error"]')).toBeVisible({ timeout: 10000 })
    expect(await savedId(page)).toBe(SAVED_ID)
  })
})
