// Tests for vault storage display in Settings > Memory tab.
// The backend reports current vault size and a 30-day projection.
// The UI formats bytes into human-readable sizes.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Vault Storage Display', () => {
  test('shows formatted current size in Memory tab', async ({ page }) => {
    await mockBootstrap(page)

    // mock vault storage endpoint
    await page.route('**/v1/vault/storage', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current_bytes: 2621440,
          projection_30d_bytes: 5242880,
        }),
      })
    })

    // mock lodestone endpoint (Memory tab fetches this)
    await page.route('**/v1/lodestone', async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ records: [] }),
      })
    })

    // mock developer status
    await page.route('**/v1/developer/status', async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dev_mode: false }),
      })
    })

    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const memoryTab = page.locator('.settings-tab', { hasText: 'Memory' })
    await memoryTab.click()

    // should show formatted size (2621440 bytes = 2.5 MB)
    const storageHint = page.locator('.settings-row-hint', { hasText: '2.5 MB' })
    await expect(storageHint).toBeVisible({ timeout: 5000 })
  })

  test('shows 30-day projection', async ({ page }) => {
    await mockBootstrap(page)

    await page.route('**/v1/vault/storage', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current_bytes: 2621440,
          projection_30d_bytes: 5242880,
        }),
      })
    })

    await page.route('**/v1/lodestone', async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ records: [] }),
      })
    })

    await page.route('**/v1/developer/status', async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dev_mode: false }),
      })
    })

    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const memoryTab = page.locator('.settings-tab', { hasText: 'Memory' })
    await memoryTab.click()

    // 5242880 bytes = 5 MB projection
    const projectionHint = page.locator('.settings-row-hint', { hasText: '5' })
    await expect(projectionHint).toBeVisible({ timeout: 5000 })
  })

  test('no storage row when backend returns error', async ({ page }) => {
    await mockBootstrap(page)

    await page.route('**/v1/vault/storage', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'unavailable' }),
      })
    })

    await page.route('**/v1/lodestone', async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ records: [] }),
      })
    })

    await page.route('**/v1/developer/status', async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dev_mode: false }),
      })
    })

    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const memoryTab = page.locator('.settings-tab', { hasText: 'Memory' })
    await memoryTab.click()

    // storage label should not appear
    const storageLabel = page.locator('.settings-row-label', { hasText: 'Storage' })
    await expect(storageLabel).not.toBeVisible({ timeout: 3000 })
  })
})
