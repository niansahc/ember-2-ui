// Requires Ember API running at localhost:8000 (start_api.bat)

const { test, expect } = require('@playwright/test')

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('opens on settings icon click', async ({ page }) => {
    // Click the settings gear in the header
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const panel = page.locator('.settings-panel')
    await expect(panel).toBeVisible()
  })

  test('shows Local and Cloud tabs in Models section', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const tabs = page.locator('.model-tabs')
    await expect(tabs).toBeVisible()

    const localTab = page.locator('.model-tab', { hasText: 'Local' })
    const cloudTab = page.locator('.model-tab', { hasText: 'Cloud' })
    await expect(localTab).toBeVisible()
    await expect(cloudTab).toBeVisible()
  })

  test('Local tab shows at least one installed model', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Local tab should be active by default
    const localTab = page.locator('.model-tab', { hasText: 'Local' })
    await expect(localTab).toHaveClass(/model-tab-active/)

    // Should show at least one model item
    const modelItems = page.locator('.model-list-item')
    await expect(modelItems.first()).toBeVisible({ timeout: 5000 })
  })

  test('Cloud tab shows disclosure notice', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const cloudTab = page.locator('.model-tab', { hasText: 'Cloud' })
    await cloudTab.click()

    const disclosure = page.locator('.cloud-disclosure')
    await expect(disclosure).toBeVisible()
    await expect(disclosure).toContainText('cloud provider')
  })

  test('Cloud tab shows provider sections', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const cloudTab = page.locator('.model-tab', { hasText: 'Cloud' })
    await cloudTab.click()

    // Should show at least Anthropic and OpenAI sections
    const providers = page.locator('.cloud-provider-name')
    await expect(providers.first()).toBeVisible()
  })

  test('version number in sidebar is not hardcoded', async ({ page }) => {
    // The sidebar version should be fetched from the API, not hardcoded.
    // We check that it shows a version string starting with "v" and is not
    // any of the old hardcoded values.
    const sidebarVersion = page.locator('.sidebar-version')
    await expect(sidebarVersion).toBeVisible({ timeout: 5000 })

    const text = await sidebarVersion.textContent()
    expect(text).toMatch(/^v\d+\.\d+/)
    expect(text).not.toBe('v0.9.1') // old hardcoded value
  })
})
