// Tests for the bare mode per-conversation toggle in the chat header.
// Bare mode strips personality from responses. The toggle only renders
// when the backend advertises bare_mode_enabled in preferences.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Bare Mode Toggle', () => {
  test('toggle is NOT visible by default (bare_mode_enabled absent)', async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // bare mode toggle should not render when pref is absent
    const toggle = page.locator('.app-header-actions .app-conv-toggle').first()
    // when bare mode is off, vault toggle is the only .app-conv-toggle
    const allToggles = page.locator('.app-header-actions .app-conv-toggle')
    const count = await allToggles.count()
    // only the vault toggle should exist (1), not bare mode
    expect(count).toBe(1)
  })

  test('toggle is visible when bare_mode_enabled is true', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { bare_mode_enabled: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // two toggles: bare mode + vault
    const allToggles = page.locator('.app-header-actions .app-conv-toggle')
    await expect(allToggles).toHaveCount(2)
  })

  test('toggle activates and deactivates on click', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { bare_mode_enabled: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // bare mode toggle is the first .app-conv-toggle when both are present
    const bareToggle = page.locator('.app-header-actions .app-conv-toggle').first()

    // initially inactive
    await expect(bareToggle).not.toHaveClass(/app-conv-toggle-active/)

    // click to activate
    await bareToggle.click()
    await expect(bareToggle).toHaveClass(/app-conv-toggle-active/)

    // click again to deactivate
    await bareToggle.click()
    await expect(bareToggle).not.toHaveClass(/app-conv-toggle-active/)
  })

  test('active toggle tooltip says "Bare mode on — personality off"', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { bare_mode_enabled: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const bareToggle = page.locator('.app-header-actions .app-conv-toggle').first()
    await bareToggle.click()
    await expect(bareToggle).toHaveClass(/app-conv-toggle-active/)

    // check title attribute for tooltip text
    await expect(bareToggle).toHaveAttribute('title', 'Bare mode on — personality off')
  })

  test('toggle resets after new conversation', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { bare_mode_enabled: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const bareToggle = page.locator('.app-header-actions .app-conv-toggle').first()
    await bareToggle.click()
    await expect(bareToggle).toHaveClass(/app-conv-toggle-active/)

    // click new conversation button
    const newConvoBtn = page.locator('[aria-label="New conversation"]')
    await newConvoBtn.click()

    // toggle should reset to inactive
    const resetToggle = page.locator('.app-header-actions .app-conv-toggle').first()
    await expect(resetToggle).not.toHaveClass(/app-conv-toggle-active/)
  })

  test('sends bare_mode: true in POST body when active', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { bare_mode_enabled: true },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // activate bare mode
    const bareToggle = page.locator('.app-header-actions .app-conv-toggle').first()
    await bareToggle.click()
    await expect(bareToggle).toHaveClass(/app-conv-toggle-active/)

    // intercept the chat completions request
    let capturedBody = null
    await page.route('**/v1/chat/completions', async (route, request) => {
      capturedBody = JSON.parse(request.postData())
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n',
      })
    })

    // send a message
    const input = page.locator('[aria-label="Message input"]')
    await input.fill('Hello')
    const sendBtn = page.locator('[aria-label="Send message"]')
    await sendBtn.click()

    // wait for the request to be captured
    await page.waitForFunction(() => true, null, { timeout: 5000 })
    // give the route handler time to fire
    await expect(async () => {
      expect(capturedBody).not.toBeNull()
      expect(capturedBody.bare_mode).toBe(true)
    }).toPass({ timeout: 5000 })
  })
})
