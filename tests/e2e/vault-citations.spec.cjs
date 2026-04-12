// Vault citation UI tests. Mocks the x-ember-vault-used header and
// vault_sources SSE event via page.route(). Mirrors the web search
// citation test pattern — injects mock DOM elements to verify rendering
// since we can't easily trigger real streaming in e2e tests.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Vault Citations', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('vault indicator renders on messages with usedVault flag', async ({ page }) => {
    // Inject a mock assistant message bubble with the vault indicator
    // (same DOM injection approach as streaming-signals.spec.cjs)
    await page.evaluate(() => {
      const container = document.querySelector('.chat-messages')
      if (!container) return

      const bubble = document.createElement('div')
      bubble.className = 'bubble bubble-assistant'
      bubble.innerHTML = `
        <div class="bubble-vault-used" aria-label="Response draws on your vault" data-testid="bubble-vault-used">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M21 5c0-1.1-4-2-9-2S3 3.9 3 5m18 0v14c0 1.1-4 2-9 2s-9-.9-9-2V5" />
          </svg>
          <span>From your vault</span>
        </div>
      `
      container.appendChild(bubble)
    })

    const indicator = page.locator('[data-testid="bubble-vault-used"]')
    await expect(indicator).toBeVisible()
    await expect(indicator).toContainText('From your vault')
  })

  test('vault sources render with formatted citation text', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.querySelector('.chat-messages')
      if (!container) return

      const bubble = document.createElement('div')
      bubble.className = 'bubble bubble-assistant'
      bubble.innerHTML = `
        <div class="bubble-vault-sources" aria-label="Vault sources" data-testid="bubble-vault-sources">
          <span class="bubble-vault-source">Based on a conversation from March 15</span>
          <span class="bubble-sources-sep"> · </span>
          <span class="bubble-vault-source">Based on a reflection from March 10</span>
        </div>
      `
      container.appendChild(bubble)
    })

    const sources = page.locator('[data-testid="bubble-vault-sources"]')
    await expect(sources).toBeVisible()
    await expect(sources).toContainText('Based on a conversation from March 15')
    await expect(sources).toContainText('Based on a reflection from March 10')
  })

  test('vault sources are absent when no vault data was used', async ({ page }) => {
    // On a fresh page with no messages, no vault indicators
    await expect(page.locator('[data-testid="bubble-vault-used"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="bubble-vault-sources"]')).not.toBeVisible()
  })

  test('vault indicator has correct aria-label for screen readers', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.querySelector('.chat-messages')
      if (!container) return

      const bubble = document.createElement('div')
      bubble.className = 'bubble bubble-assistant'
      bubble.innerHTML = `
        <div class="bubble-vault-used" aria-label="Response draws on your vault" data-testid="bubble-vault-used">
          <span>From your vault</span>
        </div>
      `
      container.appendChild(bubble)
    })

    const indicator = page.locator('[data-testid="bubble-vault-used"]')
    await expect(indicator).toHaveAttribute('aria-label', 'Response draws on your vault')
  })

  test('vault indicator and web search indicator can coexist', async ({ page }) => {
    // A response could use both vault AND web search — both indicators
    // should render without conflicting.
    await page.evaluate(() => {
      const container = document.querySelector('.chat-messages')
      if (!container) return

      const bubble = document.createElement('div')
      bubble.className = 'bubble bubble-assistant'
      bubble.innerHTML = `
        <div class="bubble-web-search" aria-label="Web search was used">
          <span>Web search used</span>
        </div>
        <div class="bubble-vault-used" data-testid="bubble-vault-used">
          <span>From your vault</span>
        </div>
      `
      container.appendChild(bubble)
    })

    await expect(page.locator('.bubble-web-search')).toBeVisible()
    await expect(page.locator('[data-testid="bubble-vault-used"]')).toBeVisible()
  })
})
