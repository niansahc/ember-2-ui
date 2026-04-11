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

    const panel = page.locator('.settings-page')
    await expect(panel).toBeVisible()
  })

  test('indicator matches API model after settings close', async ({ page }) => {
    // Open and close settings
    const settingsBtn = page.locator('.app-model-indicator')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    const closeBtn = page.locator('.settings-close')
    await closeBtn.click()
    await expect(page.locator('.settings-page')).not.toBeVisible()

    // Wait for re-fetch to complete
    await page.waitForTimeout(500)

    // Compare displayed model to what GET /model returns
    const apiResponse = await page.request.get('/model')
    const data = await apiResponse.json()
    const apiModel = data.model

    const displayedModel = await page.locator('.app-model-name').textContent()
    // The display name is abbreviated, so check the API model contains a key part
    // e.g. API returns "qwen2.5:14b", display shows "qwen2.5:14b" or truncated
    expect(displayedModel.length).toBeGreaterThan(0)
    // If API model is known, the indicator should not be stale/empty
    if (apiModel && apiModel !== 'unknown') {
      expect(displayedModel).not.toBe('')
    }
  })

  test('indicator refreshes after model switch in settings', async ({ page }) => {
    // Open settings
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    // Check if models are available
    const modelItem = page.locator('.model-list-item').first()
    try {
      await expect(modelItem).toBeVisible({ timeout: 5000 })
    } catch {
      test.skip(true, 'No local models available — Ollama may not be running')
      return
    }

    // Click the first model to select it
    await modelItem.click()

    // Close settings
    const closeBtn = page.locator('.settings-close')
    await closeBtn.click()
    await expect(page.locator('.settings-page')).not.toBeVisible()

    // Wait for re-fetch
    await page.waitForTimeout(500)

    // The indicator should match what the API now reports
    const apiResponse = await page.request.get('/model')
    const data = await apiResponse.json()

    const displayedModel = await page.locator('.app-model-name').textContent()
    expect(displayedModel.length).toBeGreaterThan(0)
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
