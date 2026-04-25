// Tests for the ask-first settings toggle in Features tab.
// "Search automatically when uncertain" is a nested toggle under
// web search that controls whether Ember asks before searching.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Ask-First Toggle', () => {
  test('toggle exists in Features tab', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const featuresTab = page.locator('.settings-tab', { hasText: 'Features' })
    await featuresTab.click()

    const toggle = page.locator('label[aria-label="Toggle autonomous web search"]')
    await expect(toggle).toBeVisible()
  })

  test('toggle is disabled when web search is off', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: false },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const featuresTab = page.locator('.settings-tab', { hasText: 'Features' })
    await featuresTab.click()

    const toggleInput = page.locator('label[aria-label="Toggle autonomous web search"] input')
    await expect(toggleInput).toBeDisabled()
  })

  test('toggle is enabled when web search is on', async ({ page }) => {
    // v0.17: ADR-034 classifier shipped on the backend, so the ask-first
    // toggle is now functional whenever web search is enabled.
    await mockBootstrap(page, {
      preferences: { web_search: true, web_search_autonomous: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const featuresTab = page.locator('.settings-tab', { hasText: 'Features' })
    await featuresTab.click()

    const toggleInput = page.locator('label[aria-label="Toggle autonomous web search"] input')
    await expect(toggleInput).not.toBeDisabled()
  })

  test('clicking toggle PATCHes /v1/preferences with web_search_autonomous flipped', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: true, web_search_autonomous: true },
    })

    // Capture PATCHes passively via page.on instead of registering a second
    // page.route — chaining a route alongside mockBootstrap fights the
    // panel-load timing in this test environment. The PATCH still goes
    // through to the backend (mockBootstrap explicitly continues non-GET
    // for `/v1/preferences`), and we just record the body off the wire.
    const patchBodies = []
    page.on('request', (req) => {
      if (
        req.url().includes('/v1/preferences') &&
        req.method() === 'PATCH'
      ) {
        try {
          patchBodies.push(req.postDataJSON())
        } catch {}
      }
    })

    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const featuresTab = page.locator('.settings-tab', { hasText: 'Features' })
    await featuresTab.click()

    // The native <input> is sr-only with width/height:0 (Settings.css
    // `.toggle input`), so Playwright's normal click() trips the viewport
    // check. Calling the DOM element's own `.click()` method via evaluate()
    // dispatches the trusted default action — checked toggles, change
    // event fires, React's onChange runs updatePreferences().
    const toggleInput = page.locator('label[aria-label="Toggle autonomous web search"] input')
    await expect(toggleInput).toBeChecked() // initial state from prefs
    await Promise.all([
      page.waitForRequest((req) =>
        req.url().includes('/v1/preferences') && req.method() === 'PATCH',
      ),
      toggleInput.evaluate((el) => el.click()),
    ])

    expect(patchBodies).toHaveLength(1)
    expect(patchBodies[0]).toEqual({ web_search_autonomous: false })
    // And the UI reflects the new state.
    await expect(toggleInput).not.toBeChecked()
  })

  test('hint text reads "Ember will ask before searching" when autonomous is off', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: true, web_search_autonomous: false },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const featuresTab = page.locator('.settings-tab', { hasText: 'Features' })
    await featuresTab.click()

    const hint = page.locator('.settings-row-hint', { hasText: 'Ember will ask before searching' })
    await expect(hint).toBeVisible()
  })

  test('hint text shows "Ember searches without asking" when autonomous is on', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: true, web_search_autonomous: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const featuresTab = page.locator('.settings-tab', { hasText: 'Features' })
    await featuresTab.click()

    const hint = page.locator('.settings-row-hint', { hasText: 'Ember searches without asking' })
    await expect(hint).toBeVisible()
  })

  test('nested row has settings-row-disabled class when web search is off', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: false },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const featuresTab = page.locator('.settings-tab', { hasText: 'Features' })
    await featuresTab.click()

    const disabledRow = page.locator('.settings-row-disabled')
    await expect(disabledRow).toBeVisible()
  })
})
