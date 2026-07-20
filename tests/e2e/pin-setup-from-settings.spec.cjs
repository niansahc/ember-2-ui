// Covers the "Set up PIN" affordance in Settings > Security.
//
// Before #22 Stage 2 this button reached App by dispatching a window
// event (ember-show-pin-setup); Stage 2 replaced that with an explicit
// onRequestPinSetup prop. This test pins the user-visible behaviour —
// clicking the button opens the PIN setup overlay — so the mechanism can
// change underneath without the guarantee changing. It is the missing
// twin of pin-change.spec.cjs (which already covered the Change PIN path).

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Set up PIN from Settings', () => {
  test.beforeEach(async ({ page }) => {
    // mockBootstrap defaults to pin_set: false, so the Security tab shows
    // the "Set up PIN" button (not "Change PIN").
    await mockBootstrap(page)
  })

  test('clicking "Set up PIN" in Security opens the PIN setup overlay', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    await page.locator('.settings-tab', { hasText: 'Security' }).click()

    // Scope to the Settings action button — the PinSetup overlay has its own
    // "Set up PIN" primary button (.pin-setup-btn-primary), which only exists
    // after this click.
    const setupBtn = page.locator('.settings-action-btn', { hasText: 'Set up PIN' })
    await expect(setupBtn).toBeVisible()
    await setupBtn.click()

    await expect(page.locator('.pin-setup-overlay')).toBeVisible()
  })
})
