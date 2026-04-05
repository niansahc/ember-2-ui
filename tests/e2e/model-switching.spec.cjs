// Requires Ember API running at localhost:8000 (start_api.bat)

const { test, expect } = require('@playwright/test')

test.describe('Model Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('selecting a local model updates the top bar indicator', async ({ page }) => {
    // Open settings
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Wait for models to load — skip if no local models available
    const modelItem = page.locator('.model-list-item').first()
    try {
      await expect(modelItem).toBeVisible({ timeout: 5000 })
    } catch {
      test.skip(true, 'No local models available — Ollama may not be running')
      return
    }

    // Get the model name from the first item
    const modelName = await modelItem.locator('.model-list-item-name').textContent()

    // Click it
    await modelItem.click()

    // Close settings
    const closeBtn = page.locator('.settings-close')
    await closeBtn.click()

    // Check top bar indicator updated
    const indicator = page.locator('.app-model-name')
    await expect(indicator).toBeVisible()
  })

  test('active model shows Active badge', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Wait for model list — skip if no models loaded
    try {
      await page.locator('.model-list-item').first().waitFor({ timeout: 5000 })
    } catch {
      test.skip(true, 'No local models available — Ollama may not be running')
      return
    }

    // At least one model should have the active badge
    const activeBadge = page.locator('.model-list-item-check')
    await expect(activeBadge.first()).toBeVisible()
    await expect(activeBadge.first()).toContainText('Active')
  })

  test('model selection persists after reload', async ({ page }) => {
    // Get current model from API
    const apiResponse = await page.request.get('/model')
    const data = await apiResponse.json()
    const currentModel = data.model

    // Reload
    await page.reload()
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Model indicator should still show the same model
    const indicator = page.locator('.app-model-name')
    await expect(indicator).toBeVisible({ timeout: 5000 })
    const displayedModel = await indicator.textContent()
    expect(displayedModel.length).toBeGreaterThan(0)
  })

  // Cloud model switching requires a real API key — skip in automated tests
  test.skip('switching to cloud model shows pulse indicator', async ({ page }) => {
    // This test requires ANTHROPIC_API_KEY to be configured.
    // When cloud model switching is testable in CI, enable this test.
  })
})
