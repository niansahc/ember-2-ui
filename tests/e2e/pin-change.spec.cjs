// Requires Ember API running at localhost:8000 (start_api.bat).
//
// Covers the Change PIN flow (added in v0.15.0). The backend /pin/change
// endpoint is mocked via page.route until G ships it; once shipped, the
// mocks become the contract test for the UI.

const { test, expect } = require('@playwright/test')

// Pretend a PIN is already set so the Change PIN button appears.
async function mockPinAlreadySet(page) {
  await page.route('**/security/pin/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ pin_set: true }),
    })
  })
}

async function openChangePinModal(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })

  const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
  await settingsBtn.click()

  const securityTab = page.locator('.settings-tab', { hasText: 'Security' })
  await securityTab.click()

  const changeBtn = page.locator('[data-testid="settings-change-pin"]')
  await expect(changeBtn).toBeVisible()
  await changeBtn.click()

  await expect(page.locator('[data-testid="pin-change-overlay"]')).toBeVisible()
}

test.describe('Change PIN flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockPinAlreadySet(page)
  })

  test('Change PIN button is visible in Security tab when a PIN is set', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const securityTab = page.locator('.settings-tab', { hasText: 'Security' })
    await securityTab.click()

    const changeBtn = page.locator('[data-testid="settings-change-pin"]')
    await expect(changeBtn).toBeVisible()
    await expect(changeBtn).toHaveText('Change PIN')
  })

  test('happy path: current PIN → new PIN → confirm → success', async ({ page }) => {
    let changeCalls = 0
    await page.route('**/security/pin/change', async (route) => {
      changeCalls += 1
      const body = route.request().postDataJSON()
      expect(body).toHaveProperty('current_pin')
      expect(body).toHaveProperty('new_pin')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'changed' }),
      })
    })

    await openChangePinModal(page)

    // Step 1: enter current PIN
    await page.locator('[data-testid="pin-change-current"]').fill('1234')
    await page.locator('.pin-setup-btn-primary').click()

    // Step 2: enter new PIN + confirm
    await page.locator('[data-testid="pin-change-new"]').fill('5678')
    await page.locator('[data-testid="pin-change-confirm"]').fill('5678')
    await page.locator('[data-testid="pin-change-submit"]').click()

    // Done state
    await expect(page.locator('.pin-setup-title', { hasText: 'PIN updated.' })).toBeVisible()
    expect(changeCalls).toBe(1)
  })

  test('mismatched new PIN shows error and does not call API', async ({ page }) => {
    let changeCalls = 0
    await page.route('**/security/pin/change', async (route) => {
      changeCalls += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    await openChangePinModal(page)

    await page.locator('[data-testid="pin-change-current"]').fill('1234')
    await page.locator('.pin-setup-btn-primary').click()

    await page.locator('[data-testid="pin-change-new"]').fill('5678')
    await page.locator('[data-testid="pin-change-confirm"]').fill('9999')
    await page.locator('[data-testid="pin-change-submit"]').click()

    await expect(page.locator('.pin-setup-error')).toContainText('New PINs do not match')
    expect(changeCalls).toBe(0)
  })

  test('same new PIN as current shows error', async ({ page }) => {
    await openChangePinModal(page)

    await page.locator('[data-testid="pin-change-current"]').fill('1234')
    await page.locator('.pin-setup-btn-primary').click()

    await page.locator('[data-testid="pin-change-new"]').fill('1234')
    await page.locator('[data-testid="pin-change-confirm"]').fill('1234')
    await page.locator('[data-testid="pin-change-submit"]').click()

    await expect(page.locator('.pin-setup-error')).toContainText('different from current')
  })

  test('wrong current PIN (backend 403) returns user to verify step with error', async ({ page }) => {
    await page.route('**/security/pin/change', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Current PIN is incorrect' }),
      })
    })

    await openChangePinModal(page)

    await page.locator('[data-testid="pin-change-current"]').fill('0000')
    await page.locator('.pin-setup-btn-primary').click()

    await page.locator('[data-testid="pin-change-new"]').fill('5678')
    await page.locator('[data-testid="pin-change-confirm"]').fill('5678')
    await page.locator('[data-testid="pin-change-submit"]').click()

    // Back on the verify step, current PIN field cleared, error shown
    await expect(page.locator('[data-testid="pin-change-current"]')).toBeVisible()
    await expect(page.locator('[data-testid="pin-change-current"]')).toHaveValue('')
    await expect(page.locator('.pin-setup-error')).toContainText('Current PIN is incorrect')
  })

  test('cancel from verify step closes the overlay', async ({ page }) => {
    await openChangePinModal(page)

    const cancelBtn = page.locator('.pin-setup-btn-secondary', { hasText: 'Cancel' })
    await cancelBtn.click()

    await expect(page.locator('[data-testid="pin-change-overlay"]')).not.toBeVisible()
  })
})
