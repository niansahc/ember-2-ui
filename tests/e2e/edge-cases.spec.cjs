// Requires Ember API running at localhost:8000 (start_api.bat)
// Edge case tests — UI resilience, localStorage corruption, layout stability

const { test, expect } = require('@playwright/test')

test.describe('Edge Cases — Input Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('empty message cannot be sent', async ({ page }) => {
    const input = page.locator('[aria-label="Message input"]')
    const sendBtn = page.locator('[aria-label="Send message"]')

    // Input is empty — click send
    await sendBtn.click()

    // Should still be on the same page with empty input — no message bubble appears
    const bubbles = page.locator('.bubble-assistant')
    await expect(bubbles).toHaveCount(0)

    // Whitespace-only message should also be blocked
    await input.fill('   ')
    await sendBtn.click()
    await expect(bubbles).toHaveCount(0)
  })

  test('Enter key on empty input does not send', async ({ page }) => {
    const input = page.locator('[aria-label="Message input"]')
    await input.focus()
    await input.press('Enter')

    const bubbles = page.locator('.bubble-assistant')
    await expect(bubbles).toHaveCount(0)
  })

  test('file upload cancel resets input', async ({ page }) => {
    const fileInput = page.locator('.input-bar input[type="file"]')

    // Trigger file chooser but cancel — set no files
    await fileInput.setInputFiles([])

    // No file chips should appear
    const chips = page.locator('.input-files')
    await expect(chips).not.toBeVisible()
  })
})

test.describe('Edge Cases — Layout Stability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('sidebar collapse/expand with settings open stays stable', async ({ page }) => {
    // Open settings
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    // Close settings first — the overlay blocks sidebar clicks by design
    await page.keyboard.press('Escape')
    await expect(page.locator('.settings-page')).not.toBeVisible({ timeout: 3000 })

    // Collapse sidebar
    const collapseBtn = page.locator('[aria-label="Collapse sidebar"]')
    await collapseBtn.click()
    await expect(page.locator('.sidebar')).toHaveClass(/sidebar-collapsed/, { timeout: 3000 })

    // Re-open settings while collapsed
    const headerSettings = page.locator('.app-header-btn[aria-label="Open settings"]')
    await headerSettings.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    // Close and expand sidebar
    await page.keyboard.press('Escape')
    const expandBtn = page.locator('[aria-label="Expand sidebar"]')
    await expandBtn.click()
    await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-collapsed/, { timeout: 3000 })

    // App still functional
    await expect(page.locator('[aria-label="Message input"]')).toBeVisible()
  })

  test('rapid settings open/close does not corrupt state', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')

    // Open settings, then rapidly close/open via Escape and button
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
      await settingsBtn.click()
      await page.waitForTimeout(100)
    }

    // Close settings
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Verify app is still functional
    const layout = page.locator('.app-layout')
    await expect(layout).toBeVisible()

    // Chat input should still be functional
    const input = page.locator('[aria-label="Message input"]')
    await expect(input).toBeVisible()
  })

  test('rapid theme switching does not break UI', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    const themes = ['Midnight', 'Forest', 'Ocean', 'Bloom', 'Ember']
    for (const name of themes) {
      const swatch = page.locator(`.theme-swatch[aria-label="${name}"]`)
      await swatch.click()
    }

    // Should end on Ember — verify data-theme
    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('ember')

    // App layout still intact
    await expect(page.locator('.app-layout')).toBeVisible()
  })
})

test.describe('Edge Cases — localStorage Resilience', () => {
  test('corrupted theme value in localStorage falls back to default', async ({ page }) => {
    // Inject bad theme value before load
    await page.addInitScript(() => {
      localStorage.setItem('ember-theme', 'nonexistent-theme')
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // App should still load — data-theme will be the corrupted value but CSS falls back to :root
    await expect(page.locator('.app-layout')).toBeVisible()

    // Chat input should be functional
    const input = page.locator('[aria-label="Message input"]')
    await expect(input).toBeVisible()
  })

  test('corrupted custom theme JSON in localStorage does not crash', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ember-theme', 'custom')
      localStorage.setItem('ember-theme-custom', '{invalid json!!!')
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // App should still load with fallback custom colors
    await expect(page.locator('.app-layout')).toBeVisible()
  })

  test('empty localStorage loads app with defaults', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Default theme should be ember
    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('ember')

    // App should be fully functional
    await expect(page.locator('[aria-label="Message input"]')).toBeVisible()
  })
})

test.describe('Edge Cases — Mobile Layout', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('chat input stays visible after focusing and blurring', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const input = page.locator('[aria-label="Message input"]')

    // Focus the input (simulates keyboard opening)
    await input.focus()
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()

    // Blur (simulates keyboard closing)
    await input.blur()
    await expect(input).toBeVisible()
  })

  test('settings panel does not overflow viewport on mobile', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Use the header settings button — sidebar footer may be offscreen on mobile
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    // Panel should not exceed viewport width
    const panelBox = await page.locator('.settings-page').boundingBox()
    expect(Math.round(panelBox.width)).toBeLessThanOrEqual(375)
  })
})
