// Requires Ember API running at localhost:8000 (start_api.bat)

const { test, expect } = require('@playwright/test')

test.describe('Model Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('appears in top bar', async ({ page }) => {
    const indicator = page.locator('.app-model-indicator')
    await expect(indicator).toBeVisible({ timeout: 5000 })
  })

  test('shows current model name', async ({ page }) => {
    const modelName = page.locator('.app-model-name')
    await expect(modelName).toBeVisible({ timeout: 5000 })

    // Should have some text (not empty)
    const text = await modelName.textContent()
    expect(text.length).toBeGreaterThan(0)
  })

  test('shows dot indicator', async ({ page }) => {
    const dot = page.locator('.app-model-dot')
    await expect(dot).toBeVisible({ timeout: 5000 })
  })

  test('clicking indicator opens Settings', async ({ page }) => {
    const indicator = page.locator('.app-model-indicator')
    await indicator.click()

    const panel = page.locator('.settings-panel')
    await expect(panel).toBeVisible()
  })

  test('dot class is consistent with displayed model name', async ({ page }) => {
    // If model name contains "Claude" or "gpt", dot should have cloud class.
    // Otherwise it should not. We read from the UI, not the API.
    const dot = page.locator('.app-model-dot')
    const modelName = page.locator('.app-model-name')
    await expect(dot).toBeVisible({ timeout: 5000 })
    await expect(modelName).toBeVisible({ timeout: 5000 })

    const name = (await modelName.textContent()).toLowerCase()
    const isCloud = name.includes('claude') || name.includes('gpt')

    if (isCloud) {
      await expect(dot).toHaveClass(/app-model-dot-cloud/)
    } else {
      await expect(dot).not.toHaveClass(/app-model-dot-cloud/)
    }
  })
})
