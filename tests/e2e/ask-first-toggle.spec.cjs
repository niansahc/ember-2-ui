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

  test('toggle is locked on when web search is on', async ({ page }) => {
    // v0.16.0: autonomous search is always on when web search is enabled —
    // ask-first is not yet available. Toggle stays disabled regardless.
    await mockBootstrap(page, {
      preferences: { web_search: true },
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

  test('hint text shows "Ask-first" when autonomous is off', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { web_search: true, web_search_autonomous: false },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const featuresTab = page.locator('.settings-tab', { hasText: 'Features' })
    await featuresTab.click()

    const hint = page.locator('.settings-row-hint', { hasText: 'Ask-first' })
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
