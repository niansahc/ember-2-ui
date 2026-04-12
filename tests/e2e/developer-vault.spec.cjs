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

// Simulates G's real response: active vault NOT in available_vaults list.
// The UI should inject it so users can switch back.
const DEV_STATUS_MISSING_DEFAULT = {
  dev_mode: true,
  active_vault: { label: 'default', path: 'C:\\EmberVault' },
  available_vaults: [
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
      // Match G's real response format: { active_vault, label, note }
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_vault: 'C:\\DEVEmberVault\\demo_vault',
          label: body.vault_label || 'demo',
          note: 'indexes cleared, will rebuild on first query',
        }),
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

  test('header badge shows vault label when dev mode active', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await loadApp(page)

    const headerBadge = page.locator('[data-testid="dev-vault-header-badge"]')
    await expect(headerBadge).toBeVisible()
    await expect(headerBadge).toContainText('live')
  })

  test('sidebar badge shows vault label when dev mode active', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await loadApp(page)

    const sidebarBadge = page.locator('[data-testid="dev-vault-sidebar-badge"]')
    await expect(sidebarBadge).toBeVisible()
    await expect(sidebarBadge).toContainText('live')
  })

  test('no badges or Developer tab when dev mode inactive', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_INACTIVE)
    await loadApp(page)

    await expect(page.locator('[data-testid="dev-vault-header-badge"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="dev-vault-sidebar-badge"]')).toHaveCount(0)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await expect(page.locator('.settings-page')).toBeVisible()
    await expect(page.locator('[data-testid="settings-tab-developer"]')).toHaveCount(0)
  })

  test('Switch Vault section shows "no alternate vaults" when list is empty', async ({ page }) => {
    const emptyVaultsStatus = {
      ...DEV_STATUS_ACTIVE,
      available_vaults: [],
    }
    await mockBootstrap(page)
    await mockDevMode(page, emptyVaultsStatus)
    await loadApp(page)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()
    await page.locator('[data-testid="settings-tab-developer"]').click()

    const switcher = page.locator('[data-testid="dev-vault-switcher"]')
    await expect(switcher).toBeVisible()
    await expect(page.locator('[data-testid="dev-vault-empty"]')).toContainText('No alternate vaults configured')
  })

  test('Memory tab vault path reflects active dev vault, not hardcoded default', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await loadApp(page)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    // Navigate to Memory tab
    const memoryTab = page.locator('.settings-tab', { hasText: 'Memory' })
    await memoryTab.click()

    // Reveal the vault path
    const eyeBtn = page.locator('.vault-path-icon-btn').first()
    await eyeBtn.click()

    const pathEl = page.locator('[data-testid="memory-vault-path"]')
    const text = await pathEl.textContent()
    // Should show the dev vault path, not the default C:\EmberVault
    expect(text).toContain('private_vault')
  })

  test('Memory tab section label shows vault label when dev mode active', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await loadApp(page)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const memoryTab = page.locator('.settings-tab', { hasText: 'Memory' })
    await memoryTab.click()

    // The "Vault" section label should include the active vault label
    const sectionLabel = page.locator('.settings-section-label', { hasText: 'Vault' }).first()
    await expect(sectionLabel).toContainText('live')
  })

  test('Switch Vault list includes default vault when not in available_vaults', async ({ page }) => {
    // G's endpoint returns default as active but NOT in available_vaults.
    // UI should inject it so users can switch back after switching away.
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_MISSING_DEFAULT)
    await loadApp(page)

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const devTab = page.locator('[data-testid="settings-tab-developer"]')
    await devTab.click()

    // Switch to demo first
    await page.route('**/developer/vault/swap', async (route) => {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_vault: 'C:\\demo_vault',
          label: body.vault_label || 'demo',
          note: 'indexes cleared',
        }),
      })
    })
    const demoOption = page.locator('[data-testid="dev-vault-option-demo"]')
    await expect(demoOption).toBeVisible()
    await demoOption.click()

    // After switching to demo, "default" should appear as a switch-back option
    const defaultOption = page.locator('[data-testid="dev-vault-option-default"]')
    await expect(defaultOption).toBeVisible()
  })
})
