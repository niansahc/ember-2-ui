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

  test('Developer tab shows active vault label and plain text path', async ({ page }) => {
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

    // Path is shown in plain text — no masking in dev tab
    const path = page.locator('[data-testid="dev-vault-path"]')
    await expect(path).toBeVisible()
    const pathText = await path.textContent()
    expect(pathText).toContain('private_vault')
    expect(pathText).not.toContain('\u2022')
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

    // Swap completes — no rebuilding note (removed in dead code cleanup).
    // Badge update confirms the swap took effect.
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

  test('Switch Vault section always offers private_vault as swap-back option', async ({ page }) => {
    // Even with an empty available_vaults list, the UI injects private_vault
    // so there's always a swap-back option.
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
    // private_vault is injected as the swap-back option
    await expect(page.locator('[data-testid="dev-vault-option-private_vault"]')).toBeVisible()
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

  // ── Swap refreshes vault-scoped state ────────────────────────────────────
  // The swap used to update one piece of state inside Settings and nothing
  // else, so the sidebar kept listing the old vault's conversations, the open
  // transcript stayed on screen, and ember_active_session still pointed at a
  // session belonging to the vault we just left. The UI looked like the swap
  // had not happened.

  function mockSwapRoute(page) {
    return page.route('**/developer/vault/swap', async (route) => {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_vault: 'C:\\test_vault',
          label: body.vault_label || 'test',
        }),
      })
    })
  }

  async function openDevTab(page) {
    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    await page.locator('[data-testid="settings-tab-developer"]').click()
  }

  test('swapping vaults reloads the conversation list', async ({ page }) => {
    // Synthetic fixtures only (Vault Privacy Rule). The list flips after the
    // swap so a stale sidebar is detectable: if the old title is still shown,
    // the UI is displaying the previous vault's data.
    let swapped = false
    await mockBootstrap(page)
    await page.route(/\/conversations(\?|$)/, (route, req) => {
      if (req.method() !== 'GET') return route.continue()
      const conversations = swapped
        ? [{ id: 'sess_b', title: 'After Swap', updated_at: new Date().toISOString(), project_id: null }]
        : [{ id: 'sess_a', title: 'Before Swap', updated_at: new Date().toISOString(), project_id: null }]
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations }) })
    })
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await page.route('**/developer/vault/swap', async (route) => {
      swapped = true
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ active_vault: 'C:\\test_vault', label: body.vault_label || 'test' }),
      })
    })
    await loadApp(page)

    await expect(page.locator('.sidebar-item', { hasText: 'Before Swap' })).toBeVisible()

    await openDevTab(page)
    await page.locator('[data-testid="dev-vault-option-test"]').click()

    await expect(page.locator('.sidebar-item', { hasText: 'After Swap' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.sidebar-item', { hasText: 'Before Swap' })).toHaveCount(0)
  })

  test('swapping vaults clears the open transcript and the stored session', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await mockSwapRoute(page)
    await page.route('**/v1/chat/completions', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"choices":[{"delta":{"content":"Answer from the first vault."}}]}\n\ndata: [DONE]\n',
      }),
    )
    await loadApp(page)

    await page.locator('[aria-label="Message input"]').fill('Question in the first vault')
    await page.locator('[aria-label="Send message"]').click()
    await expect(page.locator('.bubble-ember .bubble-markdown').last()).toContainText(
      'Answer from the first vault.',
      { timeout: 10000 },
    )

    await openDevTab(page)
    await page.locator('[data-testid="dev-vault-option-test"]').click()
    await page.locator('[aria-label="Close settings"], .settings-close').first().click()

    // The transcript belonged to the previous vault and must not survive.
    await expect(page.locator('.bubble-ember')).toHaveCount(0)
    await expect(page.locator('.bubble-user')).toHaveCount(0)

    // The stored session id points into the vault we just left, so a reload
    // would try to restore a conversation that does not exist here.
    const stored = await page.evaluate(() => localStorage.getItem('ember_active_session'))
    expect(stored).toBeNull()
  })

  test('the header badge follows the swap', async ({ page }) => {
    await mockBootstrap(page)
    await mockDevMode(page, DEV_STATUS_ACTIVE)
    await mockSwapRoute(page)
    await loadApp(page)

    await openDevTab(page)
    await page.locator('[data-testid="dev-vault-option-test"]').click()
    await page.locator('[aria-label="Close settings"], .settings-close').first().click()

    await expect(page.locator('[data-testid="dev-vault-header-badge"]')).toContainText('test')
  })
})
