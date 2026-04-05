const { test, expect } = require('@playwright/test')

test.describe('Custom Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('custom option appears in theme list', async ({ page }) => {
    // Open settings
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    // Check that "Custom" swatch exists in the theme picker
    const customSwatch = page.locator('.theme-swatch[aria-label="Custom"]')
    await expect(customSwatch).toBeVisible()
    await expect(customSwatch.locator('.theme-swatch-name')).toContainText('Custom')
  })

  test('color values apply to CSS variables', async ({ page }) => {
    // Open settings and select custom theme
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    const customSwatch = page.locator('.theme-swatch[aria-label="Custom"]')
    await customSwatch.click()

    // Verify data-theme is set to custom
    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('custom')

    // Color pickers should appear
    const accentInput = page.locator('input[aria-label="Custom accent color"]')
    const bgInput = page.locator('input[aria-label="Custom background color"]')
    await expect(accentInput).toBeVisible()
    await expect(bgInput).toBeVisible()

    // Set specific colors via JavaScript (color inputs can't be typed into reliably)
    await accentInput.evaluate((el) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeInputValueSetter.call(el, '#00ff00')
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Wait for CSS variable to update
    await page.waitForTimeout(200)

    // Verify the accent CSS variable was applied
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    )
    expect(accent).toBe('#00ff00')
  })

  test('custom theme selection persists on reload', async ({ page }) => {
    // Open settings and select custom theme
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    const customSwatch = page.locator('.theme-swatch[aria-label="Custom"]')
    await customSwatch.click()

    // Set a distinctive accent color
    const accentInput = page.locator('input[aria-label="Custom accent color"]')
    await accentInput.evaluate((el) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeInputValueSetter.call(el, '#ff0000')
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await page.waitForTimeout(200)

    // Reload
    await page.reload()
    // Wait for either app-layout (normal) or onboarding (first run) — theme applies to both
    try {
      await page.waitForSelector('.app-layout', { timeout: 15000 })
    } catch {
      // Onboarding may be showing — theme still applies at document level
    }

    // Verify theme persisted
    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('custom')

    // Verify CSS variable persisted
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    )
    expect(accent).toBe('#ff0000')
  })
})
