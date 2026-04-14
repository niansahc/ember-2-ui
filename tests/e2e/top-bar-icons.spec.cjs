// Tests for feature status icons in the top bar header.
// These icons give at-a-glance visibility into which features are
// active. Clicking an icon opens Settings to the Features tab.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Top Bar Feature Icons', () => {
  test('web search on shows Search icon with correct title', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const searchIcon = page.locator('.app-feature-icon[title="Web search is on"]')
    await expect(searchIcon).toBeVisible()
  })

  test('web search off shows bare mode icon', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: false },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const bareIcon = page.locator('.app-feature-icon[title="Bare mode — web search is off"]')
    await expect(bareIcon).toBeVisible()
  })

  test('deviation engine on shows GitBranch icon', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { deviation_enabled: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const devIcon = page.locator('.app-feature-icon[title="Deviation engine is on"]')
    await expect(devIcon).toBeVisible()
  })

  test('all features off shows only bare mode icon', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: {
        web_search: false,
        deviation_enabled: false,
      },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const allIcons = page.locator('.app-header-title-group .app-feature-icon')
    const count = await allIcons.count()

    // only the bare mode icon should appear
    expect(count).toBe(1)
    const bareIcon = page.locator('.app-feature-icon[title="Bare mode — web search is off"]')
    await expect(bareIcon).toBeVisible()
  })

  test('clicking a feature icon opens Settings to Features tab', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const searchIcon = page.locator('.app-feature-icon[title="Web search is on"]')
    await searchIcon.click()

    // settings should open to Features tab
    const settingsPanel = page.locator('.settings-page')
    await expect(settingsPanel).toBeVisible()

    const activeTab = page.locator('.settings-tab-active', { hasText: 'Features' })
    await expect(activeTab).toBeVisible()
  })

  test('feature icons have correct aria-labels', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: true, deviation_enabled: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const allIcons = page.locator('.app-header-title-group .app-feature-icon')
    const count = await allIcons.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // each icon should have an aria-label
    for (let i = 0; i < count; i++) {
      const icon = allIcons.nth(i)
      const ariaLabel = await icon.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
    }
  })
})
