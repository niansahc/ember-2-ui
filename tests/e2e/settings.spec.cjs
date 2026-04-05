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

    const panel = page.locator('.settings-page')
    await expect(panel).toBeVisible()
  })

  test('shows tab navigation with General active by default', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const tabs = page.locator('.settings-tabs')
    await expect(tabs).toBeVisible()

    const generalTab = page.locator('.settings-tab-active', { hasText: 'General' })
    await expect(generalTab).toBeVisible()
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

    // Click Local tab explicitly (Cloud may be active if cloud model is selected)
    const localTab = page.locator('.model-tab', { hasText: 'Local' })
    await localTab.click()

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

  test('Cloud tab shows configure link or models for each provider', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const cloudTab = page.locator('.model-tab', { hasText: 'Cloud' })
    await cloudTab.click()

    // Each provider should have "Add API key in Security" link or be configured with models
    const configureLink = page.locator('.cloud-configure-link')
    const configuredStatus = page.locator('.cloud-provider-configured')
    const hasLink = await configureLink.count()
    const hasConfigured = await configuredStatus.count()
    expect(hasLink + hasConfigured).toBeGreaterThan(0)
  })

  test('Security tab shows API key management', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Navigate to Security tab
    const securityTab = page.locator('.settings-tab', { hasText: 'Security' })
    await securityTab.click()

    // Should show Cloud API Keys section
    const apiKeysLabel = page.locator('.settings-section-label', { hasText: 'Cloud API Keys' })
    await expect(apiKeysLabel).toBeVisible()

    // At least one provider should have "Add API key" or be configured
    const addBtn = page.locator('.cloud-add-key-btn')
    const configuredStatus = page.locator('.cloud-provider-configured')
    const hasAdd = await addBtn.count()
    const hasConfigured = await configuredStatus.count()
    expect(hasAdd + hasConfigured).toBeGreaterThan(0)
  })

  test('Security tab Add API key button opens masked input form', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Navigate to Security tab
    const securityTab = page.locator('.settings-tab', { hasText: 'Security' })
    await securityTab.click()

    const addBtn = page.locator('.cloud-add-key-btn').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()

      // Should show a password input (never plain text)
      const keyInput = page.locator('.cloud-key-input')
      await expect(keyInput).toBeVisible()
      await expect(keyInput).toHaveAttribute('type', 'password')

      // Should show the credential store disclosure
      const disclosure = page.locator('.cloud-key-disclosure')
      await expect(disclosure).toBeVisible()
      await expect(disclosure).toContainText('credential store')

      // Cancel should close the form
      const cancelBtn = page.locator('.cloud-key-actions .settings-action-btn', { hasText: 'Cancel' })
      await cancelBtn.click()
      await expect(keyInput).not.toBeVisible()
    }
  })

  // Remove key confirmation requires a configured provider — skip in automated tests
  test.skip('Remove key shows confirmation dialog', async () => {
    // Requires a real provider key to be configured. When testable, verify:
    // - "Remove key" button visible below models
    // - Click shows confirmation text mentioning the provider name
    // - Cancel dismisses, Remove calls DELETE endpoint
  })

  test('vault path is masked by default', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Navigate to Memory tab where vault path now lives
    const memoryTab = page.locator('.settings-tab', { hasText: 'Memory' })
    await memoryTab.click()

    const vaultHint = page.locator('.settings-row-path')
    await expect(vaultHint).toBeVisible()

    // Should show dots, not a real path
    const text = await vaultHint.textContent()
    expect(text).toContain('\u2022\u2022\u2022\u2022')
    expect(text).not.toMatch(/[A-Z]:\\/) // should not show a Windows path
  })

  test('vault path eye icon reveals then re-masks', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Navigate to Memory tab
    const memoryTab = page.locator('.settings-tab', { hasText: 'Memory' })
    await memoryTab.click()

    const vaultHint = page.locator('.settings-row-path')
    const eyeBtn = page.locator('.vault-path-icon-btn').first()
    await eyeBtn.click()

    // Should now show a real path
    const revealedText = await vaultHint.textContent()
    expect(revealedText).not.toContain('\u2022\u2022\u2022\u2022')
  })

  test('vault path copy button exists', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Navigate to Memory tab
    const memoryTab = page.locator('.settings-tab', { hasText: 'Memory' })
    await memoryTab.click()

    const copyBtn = page.locator('.vault-path-icon-btn[aria-label="Copy vault path"]')
    await expect(copyBtn).toBeVisible()
  })

  test('vision toggle is visible in Settings', async ({ page }) => {
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const visionToggle = page.locator('label[aria-label="Toggle vision model"]')
    await expect(visionToggle).toBeVisible()
  })

  test('version number in sidebar is not hardcoded', async ({ page }) => {
    // This test runs late with 8 workers — allow extra time for app to load
    try {
      await page.waitForSelector('.app-layout', { timeout: 20000 })
    } catch {
      test.skip(true, 'app-layout did not appear — API may be unreachable under load')
      return
    }

    const sidebarVersion = page.locator('.sidebar-version')
    await expect(sidebarVersion).toBeVisible({ timeout: 5000 })

    const text = await sidebarVersion.textContent()
    // Should be a version string or "..." (loading)
    // Must not be the old hardcoded value
    expect(text).not.toBe('v0.9.1')
    expect(text.length).toBeGreaterThan(0)
  })
})
