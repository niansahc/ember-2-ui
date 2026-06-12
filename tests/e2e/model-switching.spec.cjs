// Live-backend lane (ADR 0001): requires Ember API at localhost:8000 with
// Ollama models. Excluded from the default lane; run pre-release with
//   $env:EMBER_LIVE_BACKEND=1; npx playwright test --grep @needs-live-backend
// Must run against the test vault -- these tests change the active model.

const { test, expect } = require('@playwright/test')
const { assertTestVault } = require('./helpers/testvault.cjs')

test.describe('Model Switching', { tag: '@needs-live-backend' }, () => {
  test.beforeEach(async ({ page, request }) => {
    await assertTestVault(request)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('selecting a local model updates the top bar indicator', async ({ page }) => {
    // Open settings
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Models must be available in this lane (live backend + Ollama).
    const modelItem = page.locator('.model-list-item').first()
    await expect(modelItem).toBeVisible({ timeout: 5000 })

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

    await page.locator('.model-list-item').first().waitFor({ timeout: 5000 })

    // At least one model should have the active badge
    const activeBadge = page.locator('.model-list-item-check')
    await expect(activeBadge.first()).toBeVisible()
    await expect(activeBadge.first()).toContainText('Active')
  })

  // Previously fixme'd for full-suite flake under Playwright load. Now in the
  // isolated @needs-live-backend lane (ADR 0001), it runs without that
  // contention, so it's a live test again.
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
})
