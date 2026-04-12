// Developer vault switcher tests. Mocks GET /v1/developer/status and
// POST /v1/developer/vault/swap via page.route(). Also mocks bootstrap
// endpoints for deterministic splash → chat transition.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const DEV_STATUS_ACTIVE = {
  dev_mode: true,
  active_vault: { label: 'live', path: 'C:\\private_vault' },
  available_vaults: [
    { label: 'live', path: 'C:\\private_vault' },
    { label: 'demo', path: 'C:\\demo_vault' },
    { label: 'test', path: 'C:\\test_vault' },
  ],
}

const DEV_STATUS_INACTIVE = { dev_mode: false }

function mockDevMode(page, status) {
  return page.route('**/developer/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(status),
    })
  })
}

async function loadApp(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
}

test.describe('Developer Vault Switcher', () => {
  test('Developer tab is NOT visible when dev mode is inactive', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_INACTIVE)
    await loadApp(page)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible()

    await expect(page.locator('[data-testid="settings-tab-developer"]')).toHaveCount(0)
  })

  test('Developer tab IS visible when dev mode is active', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await loadApp(page)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible()

    const devTab = page.locator('[data-testid="settings-tab-developer"]')
    await expect(devTab).toBeVisible()
  })

  test('Developer tab shows active vault label and masked path', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await loadApp(page)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const devTab = page.locator('[data-testid="settings-tab-developer"]')
    await devTab.click()

    const badge = page.locator('[data-testid="dev-vault-badge"]')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('live')

    // Path is masked by default
    const path = page.locator('[data-testid="dev-vault-path"]')
    await expect(path).toBeVisible()
    const pathText = await path.textContent()
    expect(pathText).toContain('\u2022\u2022\u2022\u2022')
  })

  test('Switch Vault button swaps and shows rebuilding note', async ({ page }) => {
    let swapCalls = 0
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await page.route('**/developer/vault/swap', async (route) => {
      swapCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', rebuilding: true }),
      })
    })
    await loadApp(page)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const devTab = page.locator('[data-testid="settings-tab-developer"]')
    await devTab.click()

    // Click the demo vault option
    const demoOption = page.locator('[data-testid="dev-vault-option-demo"]')
    await expect(demoOption).toBeVisible()
    await demoOption.click()

    expect(swapCalls).toBe(1)

    // Badge should update to demo
    const badge = page.locator('[data-testid="dev-vault-badge"]')
    await expect(badge).toContainText('demo')

    // Rebuilding note should appear
    const note = page.locator('[data-testid="dev-rebuilding-note"]')
    await expect(note).toBeVisible()
    await expect(note).toContainText('Indexes rebuilding')
  })

  test('Developer tab not shown when dev mode inactive (no external badges)', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_INACTIVE)
    await loadApp(page)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible()
    await expect(page.locator('[data-testid="settings-tab-developer"]')).toHaveCount(0)
  })
})
