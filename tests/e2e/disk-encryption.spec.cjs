// Requires Ember API running at localhost:8000 (start_api.bat).
//
// Covers the Device Security section in Settings › Security tab.
// Backend endpoint GET /v1/system/disk-encryption is in flight with G;
// until shipped, page.route() mocks supply the responses and these tests
// double as the UI contract.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

async function openSecurityTab(page) {
  await mockBootstrap(page)
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  await page.locator('.app-header-btn[aria-label="Open settings"]').click()
  await page.locator('.settings-tab', { hasText: 'Security' }).click()
}

test.describe('Device Security — disk encryption status', () => {
  test('enabled state shows green indicator and confirmation text', async ({ page }) => {
    await page.route('**/system/disk-encryption', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: true, platform: 'windows', method: 'bitlocker' }),
      })
    })

    await openSecurityTab(page)

    const section = page.locator('.settings-section-label', { hasText: 'Device Security' })
    await expect(section).toBeVisible()

    const enabled = page.locator('[data-testid="device-security-enabled"]')
    await expect(enabled).toBeVisible()
    await expect(enabled).toContainText('Your device storage is encrypted.')
    await expect(page.locator('[data-testid="device-security-disabled"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="device-security-error"]')).toHaveCount(0)
  })

  test('disabled state on Windows shows amber indicator and BitLocker docs link', async ({ page }) => {
    await page.route('**/system/disk-encryption', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: false, platform: 'windows', method: 'bitlocker' }),
      })
    })

    await openSecurityTab(page)

    const disabled = page.locator('[data-testid="device-security-disabled"]')
    await expect(disabled).toBeVisible()
    await expect(disabled).toContainText('Your vault data is not encrypted at rest.')

    const link = page.locator('[data-testid="device-security-link"]')
    await expect(link).toBeVisible()
    await expect(link).toContainText('BitLocker')
    await expect(link).toHaveAttribute('href', /microsoft\.com/)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('disabled state on macOS shows FileVault docs link', async ({ page }) => {
    await page.route('**/system/disk-encryption', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: false, platform: 'darwin', method: 'filevault' }),
      })
    })

    await openSecurityTab(page)

    const link = page.locator('[data-testid="device-security-link"]')
    await expect(link).toBeVisible()
    await expect(link).toContainText('FileVault')
    await expect(link).toHaveAttribute('href', /apple\.com/)
  })

  test('disabled state on Linux shows LUKS docs link', async ({ page }) => {
    await page.route('**/system/disk-encryption', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: false, platform: 'linux', method: 'luks' }),
      })
    })

    await openSecurityTab(page)

    const link = page.locator('[data-testid="device-security-link"]')
    await expect(link).toBeVisible()
    await expect(link).toContainText('LUKS')
    await expect(link).toHaveAttribute('href', /archlinux\.org/)
  })

  test('disabled state on unknown platform shows warning without link', async ({ page }) => {
    await page.route('**/system/disk-encryption', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: false, platform: 'unknown', method: null }),
      })
    })

    await openSecurityTab(page)

    const disabled = page.locator('[data-testid="device-security-disabled"]')
    await expect(disabled).toBeVisible()
    await expect(disabled).toContainText('Your vault data is not encrypted at rest.')
    await expect(page.locator('[data-testid="device-security-link"]')).toHaveCount(0)
  })

  test('network error shows muted error message', async ({ page }) => {
    await page.route('**/system/disk-encryption', async (route) => {
      await route.abort('failed')
    })

    await openSecurityTab(page)

    const errorRow = page.locator('[data-testid="device-security-error"]')
    await expect(errorRow).toBeVisible()
    await expect(errorRow).toContainText('Unable to check encryption status.')
  })

  test('500 response from backend shows error message', async ({ page }) => {
    await page.route('**/system/disk-encryption', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    })

    await openSecurityTab(page)

    const errorRow = page.locator('[data-testid="device-security-error"]')
    await expect(errorRow).toBeVisible()
    await expect(errorRow).toContainText('Unable to check encryption status.')
  })
})
