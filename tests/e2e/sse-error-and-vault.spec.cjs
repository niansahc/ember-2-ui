// SSE error frame and vault badge tests — ADR-040 contract v3.
//
// Test 1: Error frame renders as error state
// Test 2: Tokens already rendered stay on screen when error frame follows mid-stream
// Test 3: Vault badge is set from vault_sources frame on streaming responses
// Test 4: Vault badge is absent when no vault_sources frame (positive control)

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const gotoApp = async (page) => {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
}

const send = async (page, text) => {
  await page.locator('[aria-label="Message input"]').fill(text)
  await page.locator('[aria-label="Send message"]').click()
}

const errorBubble = (page) => page.locator('[data-testid="chat-error"]')

test.describe('SSE contract v3 — error frames and vault badge', () => {
  test('error frame renders as error state with user-facing message', async ({ page }) => {
    await mockBootstrap(page)
    const errorMessage = 'The model failed to generate a response'
    await page.route('**/v1/chat/completions', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({ type: 'error', code: 'generation_failed', message: errorMessage })}\ndata: [DONE]\n`,
      }),
    )
    await gotoApp(page)

    await send(page, 'Test error frame')

    // Error frame should render as an error bubble
    const error = errorBubble(page)
    await expect(error).toBeVisible({ timeout: 10000 })
    // User-facing message must be visible
    await expect(error).toContainText(errorMessage)
    // Code value must never appear in the DOM
    const errorText = await error.innerText()
    expect(errorText).not.toContain('generation_failed')
  })

  test('tokens rendered before error frame stay on screen', async ({ page }) => {
    // The error happens mid-stream: some tokens were rendered, then an error
    // frame terminates the stream. The tokens stay visible, marked as error.
    await mockBootstrap(page)
    await page.route('**/v1/chat/completions', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body:
          'data: {"choices":[{"delta":{"content":"Here are some"}}]}\n' +
          'data: {"choices":[{"delta":{"content":" useful"}}]}\n' +
          'data: {"choices":[{"delta":{"content":" tokens"}}]}\n' +
          `data: ${JSON.stringify({ type: 'error', code: 'generation_failed', message: 'Stream interrupted' })}\n` +
          'data: [DONE]\n',
      }),
    )
    await gotoApp(page)

    await send(page, 'Test mid-stream error')

    // The tokens should still be visible
    const bubble = page.locator('.bubble-ember').last()
    await expect(bubble).toBeVisible({ timeout: 10000 })
    const content = await bubble.innerText()
    expect(content).toContain('Here are some useful tokens')
    // The entire message should be marked as error
    const errorIndicator = bubble.locator('[data-testid="chat-error"]')
    await expect(errorIndicator).toBeVisible()
  })

  test('vault badge is set from vault_sources frame on streaming', async ({ page }) => {
    // When the stream includes a vault_sources frame, usedVault badge must be set
    await mockBootstrap(page)
    await page.route('**/v1/chat/completions', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'x-ember-web-search': 'false',
          'x-ember-vault-used': 'false', // Header says no vault
          'x-ember-vision-used': 'false',
        },
        body:
          'data: {"choices":[{"delta":{"content":"Based"}}]}\n' +
          'data: {"choices":[{"delta":{"content":" on"}}]}\n' +
          `data: ${JSON.stringify({ type: 'vault_sources', sources: [{ id: 'v1', title: 'My Note' }] })}\n` +
          'data: {"choices":[{"delta":{"content":" your vault"}}]}\n' +
          'data: {"choices":[{"delta":{"finish_reason":"stop"}}]}\n' +
          'data: [DONE]\n',
      }),
    )
    await gotoApp(page)

    await send(page, 'Query my vault')

    // The message should have vault attribution visible
    const bubble = page.locator('.bubble-ember').last()
    await expect(bubble).toBeVisible({ timeout: 10000 })
    // Look for vault badge/attribution label
    const attribution = bubble.locator('.bubble-attribution')
    await expect(attribution).toBeVisible()
    await expect(attribution).toContainText(/Vault|vault/)
  })

  test('vault badge is absent when no vault_sources frame (positive control)', async ({ page }) => {
    // When the stream has no vault_sources frame, usedVault must be false
    // even if vault_enabled was sent in the request
    await mockBootstrap(page)
    await page.route('**/v1/chat/completions', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'x-ember-web-search': 'false',
          'x-ember-vault-used': 'false',
          'x-ember-vision-used': 'false',
        },
        body:
          'data: {"choices":[{"delta":{"content":"Just"}}]}\n' +
          'data: {"choices":[{"delta":{"content":" a"}}]}\n' +
          'data: {"choices":[{"delta":{"content":" normal"}}]}\n' +
          'data: {"choices":[{"delta":{"content":" response"}}]}\n' +
          'data: {"choices":[{"delta":{"finish_reason":"stop"}}]}\n' +
          'data: [DONE]\n',
      }),
    )
    await gotoApp(page)

    await send(page, 'No vault this time')

    const bubble = page.locator('.bubble-ember').last()
    await expect(bubble).toBeVisible({ timeout: 10000 })
    // Vault attribution must NOT be present
    const attribution = bubble.locator('.bubble-attribution')
    // If attribution exists, it must not mention vault
    const attributionText = await attribution.innerText().catch(() => '')
    expect(attributionText).not.toContain('Vault')
    expect(attributionText).not.toContain('vault')
  })
})
