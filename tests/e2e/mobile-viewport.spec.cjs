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

  // Contract change (header-mobile-collision fix): model indicator is now
  // collapsed on mobile. Users still see the active model via the Settings gear.
  test('model indicator is hidden on mobile', async ({ page }) => {
    const indicator = page.locator('.app-model-indicator')
    await expect(indicator).toBeHidden()
  })

  test('send button is tappable size on mobile', async ({ page }) => {
    const sendBtn = page.locator('.input-send')
    await expect(sendBtn).toBeVisible()

    const box = await sendBtn.boundingBox()
    // Touch target should be at least 36x36 for accessibility
    expect(box.width).toBeGreaterThanOrEqual(36)
    expect(box.height).toBeGreaterThanOrEqual(36)
  })

  // ─────────────────────────────────────────────────────────────────
  // Header mobile collision fix (spec: M_bug_header_mobile_collision.md)
  // ─────────────────────────────────────────────────────────────────

  test('header has no horizontal overflow at 360px', async ({ page }) => {
    // Tightest supported mobile viewport per the spec.
    await page.setViewportSize({ width: 360, height: 780 })
    // Allow CSS reflow to settle after the resize.
    await page.waitForTimeout(100)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(360)
  })

  test('overflow button opens panel with bare-mode and vault rows', async ({ page }) => {
    const overflowBtn = page.locator('.app-overflow-btn')
    await expect(overflowBtn).toBeVisible()

    await overflowBtn.click()

    const panel = page.locator('.app-overflow-panel')
    await expect(panel).toBeVisible()
    // Bare mode + Save to vault are always rendered; Export only when there's
    // a message history (mockBootstrap starts with none, so we don't assert it).
    await expect(panel.locator('.app-overflow-item', { hasText: 'Bare mode' })).toBeVisible()
    await expect(panel.locator('.app-overflow-item', { hasText: 'Save to vault' })).toBeVisible()
  })

  test('outside click dismisses the overflow panel', async ({ page }) => {
    const overflowBtn = page.locator('.app-overflow-btn')
    await overflowBtn.click()

    const panel = page.locator('.app-overflow-panel')
    await expect(panel).toBeVisible()

    // Click on the header title — outside the overflow container.
    await page.locator('.app-header-title').click()
    await expect(panel).toBeHidden()
  })

  test('feature indicators hide inside the title group on mobile', async ({ page }) => {
    // `webSearchOn` defaults to true when prefs.web_search is undefined
    // (App.jsx line 141: `prefs.web_search !== false`), so the feature icon
    // renders in the DOM. The mobile CSS rule hides it with display:none —
    // so we assert visibility, not DOM count. Any icon that is rendered
    // must be hidden at ≤600px.
    const featureIcon = page.locator('.app-header-title-group .app-feature-icon').first()
    await expect(featureIcon).toBeHidden()
  })

  test('overflow button is hidden at desktop width', async ({ page }) => {
    // Override the describe-level mobile viewport for this one assertion.
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(100)
    const overflowBtn = page.locator('.app-overflow-btn')
    await expect(overflowBtn).toBeHidden()
  })
})
