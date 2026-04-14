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

  test('web search off does NOT show bare mode icon', async ({ page }) => {
    // bare mode icon is tied to per-conversation bareMode state,
    // not to web search being off
    await mockBootstrap(page, {
      preferences: { web_search: false },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const bareIcon = page.locator('.app-feature-icon[title*="Bare mode"]')
    await expect(bareIcon).not.toBeVisible()
  })

  test('bare mode icon appears when per-conversation bare mode is ON', async ({ page }) => {
    // the bare mode icon only appears when the per-conversation toggle is active.
    // Activating the toggle requires bare_mode_enabled capability in prefs.
    await mockBootstrap(page, {
      preferences: { bare_mode_enabled: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // initially no bare mode icon in feature icons (toggle is off by default)
    const bareIcon = page.locator('.app-feature-icon[title*="Bare mode"]')
    await expect(bareIcon).not.toBeVisible()

    // click the per-conversation bare mode toggle in header actions
    const bareToggle = page.locator('.app-header-actions .app-conv-toggle').first()
    await bareToggle.click()

    // now the feature icon should appear
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

  test('all features off shows no feature icons', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: {
        web_search: false,
        deviation_enabled: false,
      },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // with web search off, no search/autonomous icons. bare mode icon is gated
    // on per-conversation state, not web search, so nothing should render.
    const allIcons = page.locator('.app-header-title-group .app-feature-icon')
    await expect(allIcons).toHaveCount(0)
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
