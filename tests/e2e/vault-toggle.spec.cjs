// Tests for the per-conversation vault toggle in the chat header.
// The vault toggle lets users disable vault storage for a single
// conversation. When off, a banner warns that the conversation
// won't be saved.
// Both bare mode and vault toggles are always visible — vault is the
// second .app-conv-toggle (bare mode is first).

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Vault Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('vault toggle is visible in chat header by default', async ({ page }) => {
    const vaultToggle = page.locator('.app-header-actions .app-conv-toggle').last()
    await expect(vaultToggle).toBeVisible()
  })

  test('clicking toggles vault off and adds active class', async ({ page }) => {
    const vaultToggle = page.locator('.app-header-actions .app-conv-toggle').last()
    await expect(vaultToggle).not.toHaveClass(/app-conv-toggle-active/)

    await vaultToggle.click()
    await expect(vaultToggle).toHaveClass(/app-conv-toggle-active/)
  })

  test('vault off shows banner warning', async ({ page }) => {
    const vaultToggle = page.locator('.app-header-actions .app-conv-toggle').last()
    await vaultToggle.click()

    const banner = page.locator('.app-vault-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText("Vault off — this conversation won't be saved.")
  })

  test('vault back on hides the banner', async ({ page }) => {
    const vaultToggle = page.locator('.app-header-actions .app-conv-toggle').last()

    // toggle off
    await vaultToggle.click()
    await expect(page.locator('.app-vault-banner')).toBeVisible()

    // toggle back on
    await vaultToggle.click()
    await expect(page.locator('.app-vault-banner')).not.toBeVisible()
  })

  test('sends vault_enabled: false in POST body when vault is off', async ({ page }) => {
    const vaultToggle = page.locator('.app-header-actions .app-conv-toggle').last()
    await vaultToggle.click()
    await expect(vaultToggle).toHaveClass(/app-conv-toggle-active/)

    let capturedBody = null
    await page.route('**/v1/chat/completions', async (route, request) => {
      capturedBody = JSON.parse(request.postData())
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n',
      })
    })

    const input = page.locator('[aria-label="Message input"]')
    await input.fill('Test message')
    const sendBtn = page.locator('[aria-label="Send message"]')
    await sendBtn.click()

    await expect(async () => {
      expect(capturedBody).not.toBeNull()
      expect(capturedBody.vault_enabled).toBe(false)
    }).toPass({ timeout: 5000 })
  })

  test('resets on new conversation', async ({ page }) => {
    const vaultToggle = page.locator('.app-header-actions .app-conv-toggle').last()
    await vaultToggle.click()
    await expect(vaultToggle).toHaveClass(/app-conv-toggle-active/)
    await expect(page.locator('.app-vault-banner')).toBeVisible()

    // start new conversation
    const newConvoBtn = page.locator('[aria-label="New conversation"]')
    await newConvoBtn.click()

    // vault toggle should reset
    const resetToggle = page.locator('.app-header-actions .app-conv-toggle').last()
    await expect(resetToggle).not.toHaveClass(/app-conv-toggle-active/)
    await expect(page.locator('.app-vault-banner')).not.toBeVisible()
  })
})
