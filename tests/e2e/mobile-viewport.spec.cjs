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

  test('model indicator is hidden on mobile to save header space', async ({ page }) => {
    // Intentional contract change (fix/header-mobile-collision): at <= 600px
    // the model pill collapses. Settings -> General is still reachable via
    // the gear button and hamburger sidebar.
    const indicator = page.locator('.app-model-indicator')
    await expect(indicator).toBeHidden({ timeout: 5000 })
  })

  test('header fits viewport with no horizontal overflow at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    const header = page.locator('.app-header')
    const box = await header.boundingBox()
    expect(box).not.toBeNull()
    expect(box.width).toBeLessThanOrEqual(360)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  test('overflow button is visible and opens panel on mobile', async ({ page }) => {
    const btn = page.locator('[data-testid="overflow-btn"]')
    await expect(btn).toBeVisible()
    await btn.click()
    const panel = page.locator('[data-testid="overflow-panel"]')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Bare mode')
    await expect(panel).toContainText('Save to vault')
  })

  test('overflow panel closes on outside click', async ({ page }) => {
    await page.locator('[data-testid="overflow-btn"]').click()
    await expect(page.locator('[data-testid="overflow-panel"]')).toBeVisible()
    await page.locator('.app-header-title').click()
    await expect(page.locator('[data-testid="overflow-panel"]')).toBeHidden()
  })

  test('feature status icons in the title group are hidden on mobile', async ({ page }) => {
    // web_search preference defaults to "not false" → Search icon renders.
    // The mobile CSS should visually hide any feature icon that renders.
    const icons = page.locator('.app-header-title-group .app-feature-icon')
    const count = await icons.count()
    expect(count).toBeGreaterThan(0) // rendered in DOM
    for (let i = 0; i < count; i++) {
      await expect(icons.nth(i)).toBeHidden()
    }
  })

  test('overflow button is not visible when viewport is resized to desktop', async ({ page }) => {
    // Start at mobile (from test.use), resize up, confirm the CSS breakpoint flips.
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.locator('[data-testid="overflow-btn"]')).toBeHidden()
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
