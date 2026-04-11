const { test, expect } = require('@playwright/test')

test.describe('Bug Report', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Open Settings → About tab → "Report a bug" to open the bug report modal
    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })

    const aboutTab = page.locator('.settings-tab', { hasText: 'About' })
    await aboutTab.click()

    const bugBtn = page.locator('.settings-link-btn', { hasText: 'Report a bug' })
    await bugBtn.click()
    await expect(page.locator('.bugreport-modal')).toBeVisible({ timeout: 5000 })
  })

  test('bug report modal opens with title and form', async ({ page }) => {
    await expect(page.locator('.bugreport-title')).toContainText('Report a Bug')
    await expect(page.locator('#bug-title')).toBeVisible()
    await expect(page.locator('#bug-desc')).toBeVisible()
  })

  test('privacy info icon is visible next to title', async ({ page }) => {
    const infoIcon = page.locator('.bugreport-info-icon')
    await expect(infoIcon).toBeVisible()
    await expect(infoIcon).toHaveAttribute('aria-label', 'Privacy information')
  })

  test('privacy tooltip contains disclosure text', async ({ page }) => {
    const infoIcon = page.locator('.bugreport-info-icon')
    const tooltip = page.locator('.bugreport-info-tooltip')

    // Hover the icon to ensure tooltip is visible
    await infoIcon.hover()
    await expect(tooltip).toBeVisible({ timeout: 2000 })

    // Verify disclosure content
    await expect(tooltip).toContainText('GitHub issue')
    await expect(tooltip).toContainText('Only the title and description')
    await expect(tooltip).toContainText('no device info')
  })

  test('submit button is disabled when title is empty', async ({ page }) => {
    const submitBtn = page.locator('.bugreport-submit')
    await expect(submitBtn).toBeDisabled()
  })

  test('close button dismisses the modal', async ({ page }) => {
    const closeBtn = page.locator('button[aria-label="Close bug report"]')
    await closeBtn.click()
    await expect(page.locator('.bugreport-modal')).not.toBeVisible()
  })
})
