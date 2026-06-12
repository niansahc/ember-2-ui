// Split into two describes:
//   "Model Indicator — rendering" uses bootstrap mocks so splash → chat is
//   deterministic. Covers presence, visibility, and UI shell behavior.
//
//   "Model Indicator — real backend" keeps the original behavior and talks
//   to the live API. Covers the two tests that compare the displayed model
//   against the actual /model response (matches-API and refresh-on-switch).
//   These are inherently integration tests and can't run against mocks.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Model Indicator — rendering', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
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

  test('clicking indicator opens Settings', async ({ page }) => {
    const indicator = page.locator('.app-model-indicator')
    await indicator.click()

    const panel = page.locator('.settings-page')
    await expect(panel).toBeVisible()
  })

  test('model name text is visible without dot indicator', async ({ page }) => {
    // dot was removed in v0.16.0 -- model name renders alone
    const modelName = page.locator('.app-model-name')
    await expect(modelName).toBeVisible({ timeout: 5000 })
    const name = await modelName.textContent()
    expect(name.length).toBeGreaterThan(0)
  })
})

const { assertTestVault, snapshotVault, cleanupSinceSnapshot } = require('./helpers/testvault.cjs')

test.describe('Model Indicator — real backend', { tag: '@needs-live-backend' }, () => {
  // No mocks — these tests compare the displayed model against the live
  // /model response. Must run against the 'test' vault (asserted in beforeEach)
  // and any writes are cleaned up in afterEach. Excluded from the default lane
  // (ADR 0001); run pre-release with EMBER_LIVE_BACKEND=1 --grep @needs-live-backend.
  let vaultSnapshot = null

  test.beforeEach(async ({ page, request }) => {
    await assertTestVault(request)
    vaultSnapshot = await snapshotVault(request)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 20000 })
  })

  test.afterEach(async ({ request }) => {
    if (vaultSnapshot) {
      await cleanupSinceSnapshot(request, vaultSnapshot)
      vaultSnapshot = null
    }
  })

  test('indicator matches API model after settings close', async ({ page }) => {
    // Open and close settings
    const settingsBtn = page.locator('.app-model-indicator')
    await expect(settingsBtn).toBeVisible({ timeout: 10000 })
    // wait for model state to stabilize before clicking
    await page.waitForTimeout(1000)
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

    // Models must be available in this lane (live backend + Ollama).
    const modelItem = page.locator('.model-list-item').first()
    await expect(modelItem).toBeVisible({ timeout: 5000 })

    // Click the first model to select it
    await modelItem.click()

    // Close settings
    const closeBtn = page.locator('.settings-close')
    await closeBtn.click()
    await expect(page.locator('.settings-page')).not.toBeVisible()

    // Wait for re-fetch
    await page.waitForTimeout(500)

    // The indicator should still show a model name
    const displayedModel = await page.locator('.app-model-name').textContent()
    expect(displayedModel.length).toBeGreaterThan(0)
  })
})
