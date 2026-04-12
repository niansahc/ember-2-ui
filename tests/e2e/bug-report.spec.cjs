const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Bug Report', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
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

  test('bug report modal opens with title and GitHub link', async ({ page }) => {
    await expect(page.locator('.bugreport-title')).toContainText('Report a Bug')
    await expect(page.locator('.bugreport-github-link')).toBeVisible()
    await expect(page.locator('.bugreport-github-link')).toContainText('Open GitHub Issues')
  })

  test('GitHub link points to correct URL and opens in new tab', async ({ page }) => {
    const link = page.locator('.bugreport-github-link')
    await expect(link).toHaveAttribute('href', 'https://github.com/niansahc/ember-2/issues/new')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('privacy info icon is visible next to title', async ({ page }) => {
    const infoIcon = page.locator('.bugreport-info-icon')
    await expect(infoIcon).toBeVisible()
    await expect(infoIcon).toHaveAttribute('aria-label', 'Privacy information')
  })

  test('privacy tooltip contains disclosure text', async ({ page }) => {
    const infoIcon = page.locator('.bugreport-info-icon')
    const tooltip = page.locator('.bugreport-info-tooltip')

    await infoIcon.hover()
    await expect(tooltip).toBeVisible({ timeout: 2000 })

    await expect(tooltip).toContainText('GitHub Issues')
    await expect(tooltip).toContainText('Ember does not send any data')
  })

  test('close button dismisses the modal', async ({ page }) => {
    const closeBtn = page.locator('button[aria-label="Close bug report"]')
    await closeBtn.click()
    await expect(page.locator('.bugreport-modal')).not.toBeVisible()
  })
})
