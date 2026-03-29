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

  test('dot has cloud class when cloud model is active', async ({ page }) => {
    // This test checks the CSS class logic — if a cloud model happens
    // to be active, the dot should have the cloud class. If local model
    // is active, it should not. We just verify the dot exists and has
    // a consistent class state.
    const dot = page.locator('.app-model-dot')
    await expect(dot).toBeVisible({ timeout: 5000 })

    // Get current model from API
    const apiResponse = await page.request.get('/model', {
      headers: { Authorization: 'Bearer test' },
    })
    const data = await apiResponse.json()
    const isCloud = data.model?.startsWith('claude-') || data.model?.startsWith('gpt-')

    if (isCloud) {
      await expect(dot).toHaveClass(/app-model-dot-cloud/)
    } else {
      await expect(dot).not.toHaveClass(/app-model-dot-cloud/)
    }
  })
})
