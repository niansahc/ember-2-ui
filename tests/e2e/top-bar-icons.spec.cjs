// Tests for feature status icons in the top bar header.
// These icons give at-a-glance visibility into which features are
// active. Clicking an icon opens Settings to the Features tab.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')
const { skipIfBackendDown } = require('./helpers/skip-if-backend-down.cjs')

test.describe('Top Bar Feature Icons', () => {
  // When run against the built UI on :8000, page.goto('/') hits the FastAPI
  // server and fails with ERR_ABORTED if the backend is offline. Skip cleanly
  // rather than reporting a false failure (BUG-M-002).
  test.beforeEach(async () => {
    await skipIfBackendDown(test)
  })

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

  test('bare mode toggle activates without adding a redundant feature icon', async ({ page }) => {
    // Contract change (M_bug_bare_mode_redundant_icons.md, Option A):
    // when bare mode is ON, the per-conversation toggle button alone
    // communicates the active state. The old duplicate status
    // .app-feature-icon in the title group has been removed — two ×
    // glyphs side by side read as a bug.
    await mockBootstrap(page, {
      preferences: { bare_mode_enabled: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const bareIcon = page.locator('.app-feature-icon[title*="Bare mode"]')
    const bareToggle = page.locator('.app-header-actions .app-conv-toggle').first()

    // off by default — neither a title-group feature icon nor an active toggle
    await expect(bareIcon).toHaveCount(0)
    await expect(bareToggle).not.toHaveClass(/app-conv-toggle-active/)

    // activate bare mode via the header-actions toggle
    await bareToggle.click()

    // the toggle alone carries the active state; no redundant feature icon appears
    await expect(bareToggle).toHaveClass(/app-conv-toggle-active/)
    await expect(bareIcon).toHaveCount(0)
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
