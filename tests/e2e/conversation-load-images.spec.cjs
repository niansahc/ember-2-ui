// Reloaded user turns that carried images show a count note (no bytes are
// returned by the API), and cannot be edited because a resend would drop them.
// Synthetic fixtures only; mocked endpoints per ADR 0001.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const CONVO = {
  id: 'sess_imgnote01',
  title: 'Synthetic Image Conversation',
  updated_at: new Date().toISOString(),
  project_id: null,
}
const ts = new Date().toISOString()
const NOTE = '[data-testid="bubble-image-note"]'

async function loadWith(page, turns) {
  await mockBootstrap(page, { conversations: [CONVO] })
  await page.route(/\/conversations\/[^/?]+$/, async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ turns }) })
  })
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  // On a narrow viewport the sidebar starts closed behind the hamburger.
  const menuBtn = page.locator('.app-menu-btn')
  if (await menuBtn.isVisible()) await menuBtn.click()
  await page.locator('.sidebar-item').first().click()
  await expect(page.locator('.bubble').first()).toBeVisible({ timeout: 10000 })
}

test.describe('Reloaded image turns', () => {
  test('image-only turn shows "1 image sent" with no empty text paragraph', async ({ page }) => {
    await loadWith(page, [{ id: 't1', role: 'user', content: '', image_count: 1, timestamp: ts }])
    await expect(page.locator(NOTE)).toHaveText('1 image sent')
    await expect(page.locator('.bubble-text')).toHaveCount(0)
  })

  test('turn with text and 3 images shows "3 images sent" and the text', async ({ page }) => {
    await loadWith(page, [{ id: 't1', role: 'user', content: 'look at these', image_count: 3, timestamp: ts }])
    await expect(page.locator(NOTE)).toHaveText('3 images sent')
    await expect(page.locator('.bubble-text')).toHaveText('look at these')
  })

  test('image_count 0 shows no note (control: the 3-image test shows it)', async ({ page }) => {
    await loadWith(page, [{ id: 't1', role: 'user', content: 'plain', image_count: 0, timestamp: ts }])
    await expect(page.locator('.bubble-text')).toHaveText('plain')
    await expect(page.locator(NOTE)).toHaveCount(0)
  })

  test('old backend without image_count shows no note', async ({ page }) => {
    await loadWith(page, [{ id: 't1', role: 'user', content: 'plain', timestamp: ts }])
    await expect(page.locator('.bubble-text')).toHaveText('plain')
    await expect(page.locator(NOTE)).toHaveCount(0)
  })

  test('assistant turn never shows the note', async ({ page }) => {
    await loadWith(page, [
      { id: 't1', role: 'user', content: '', image_count: 1, timestamp: ts },
      { id: 't2', role: 'assistant', content: 'seen', image_count: 2, timestamp: ts },
    ])
    // Control: the user turn's note is present, so the selector can match.
    await expect(page.locator(NOTE)).toHaveCount(1)
    await expect(page.locator('.bubble-ember ' + NOTE)).toHaveCount(0)
  })

  test('Edit is hidden on a reloaded image turn and shown on a plain user turn', async ({ page }) => {
    await loadWith(page, [
      { id: 't1', role: 'user', content: 'with image', image_count: 2, timestamp: ts },
      { id: 't2', role: 'user', content: 'plain turn', image_count: 0, timestamp: ts },
    ])
    const imageRow = page.locator('.bubble-row', { hasText: 'with image' })
    const plainRow = page.locator('.bubble-row', { hasText: 'plain turn' })
    // Positive control: the plain user turn exposes Edit.
    await expect(plainRow.getByRole('button', { name: 'Edit message' })).toHaveCount(1)
    await expect(imageRow.getByRole('button', { name: 'Edit message' })).toHaveCount(0)
  })

  test('note wraps inside a 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 })
    await loadWith(page, [{ id: 't1', role: 'user', content: '', image_count: 12, timestamp: ts }])
    await expect(page.locator(NOTE)).toHaveText('12 images sent')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
})
