// Uses bootstrap mocks so splash → chat transition is deterministic under
// parallel worker load. None of the tests in this file inspect real model
// or preference data; they verify mobile layout behavior.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

// iPhone 14 viewport
const MOBILE = { width: 390, height: 844 }

test.describe('Mobile Viewport', () => {
  test.use({ viewport: MOBILE })

  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('chat input is visible and not obscured', async ({ page }) => {
    const inputBar = page.locator('.input-bar')
    await expect(inputBar).toBeVisible()

    // Check it's within the viewport
    const box = await inputBar.boundingBox()
    expect(box).not.toBeNull()
    expect(box.y + box.height).toBeLessThanOrEqual(MOBILE.height + 10) // small tolerance
  })

  test('sidebar is closed by default on mobile', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    // On mobile, sidebar should not have sidebar-open class by default
    await expect(sidebar).not.toHaveClass(/sidebar-open/)
  })

  test('hamburger menu button is visible on mobile', async ({ page }) => {
    const menuBtn = page.locator('.app-menu-btn')
    await expect(menuBtn).toBeVisible()
  })

  test('hamburger menu opens sidebar on mobile', async ({ page }) => {
    const menuBtn = page.locator('.app-menu-btn')
    await menuBtn.click()

    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toHaveClass(/sidebar-open/)
  })

  test('settings panel opens and closes on mobile', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const panel = page.locator('.settings-page')
    await expect(panel).toBeVisible()

    // Panel should be full width on mobile
    const box = await panel.boundingBox()
    expect(box.width).toBeGreaterThanOrEqual(MOBILE.width - 5)

    // Close it
    const closeBtn = page.locator('.settings-close')
    await closeBtn.click()
    await expect(panel).not.toBeVisible()
  })

  test('model indicator is visible in top bar on mobile', async ({ page }) => {
    const indicator = page.locator('.app-model-indicator')
    await expect(indicator).toBeVisible({ timeout: 5000 })
  })

  test('send button is tappable size on mobile', async ({ page }) => {
    const sendBtn = page.locator('.input-send')
    await expect(sendBtn).toBeVisible()

    const box = await sendBtn.boundingBox()
    // Touch target should be at least 36x36 for accessibility
    expect(box.width).toBeGreaterThanOrEqual(36)
    expect(box.height).toBeGreaterThanOrEqual(36)
  })
})
