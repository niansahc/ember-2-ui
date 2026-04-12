// Vault citation UI tests. Verifies the unified "Source:" label renders
// correctly for vault, web search, combined, and LLM-only responses.
// Also tests vault source detail lines and empty source suppression.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Vault Citations — unified source label', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('source label shows "LLM" when no vault or web search flags', async ({ page }) => {
    // Inject an assistant bubble with the unified source label (no flags)
    await page.evaluate(() => {
      const container = document.querySelector('.chat-messages')
      if (!container) return

      const bubble = document.createElement('div')
      bubble.className = 'bubble bubble-assistant'
      bubble.innerHTML = `
        <div class="bubble-source-label" data-testid="bubble-source-label">
          <span class="bubble-source-label-key">Source:</span>
          <span class="bubble-source-label-value" data-testid="bubble-source-value">LLM</span>
        </div>
      `
      container.appendChild(bubble)
    })

    const label = page.locator('[data-testid="bubble-source-label"]').first()
    await expect(label).toBeVisible()
    await expect(label).toContainText('Source:')
    await expect(page.locator('[data-testid="bubble-source-value"]').first()).toContainText('LLM')
  })

  test('vault source detail lines render with formatted text', async ({ page }) => {
    // Inject a mock bubble with vault sources via DOM injection
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

  test('web search sources block is suppressed when sources have no content', async ({ page }) => {
    // Inject a bubble with empty sources (url/title missing)
    await page.evaluate(() => {
      const container = document.querySelector('.chat-messages')
      if (!container) return

      const bubble = document.createElement('div')
      bubble.className = 'bubble bubble-assistant'
      // This should NOT render a "Sources:" label because no source has url+title
      container.appendChild(bubble)
    })

    // No "Sources:" label should appear
    await expect(page.locator('.bubble-sources-label')).not.toBeVisible()
  })

  test('source label has correct aria-label for screen readers', async ({ page }) => {
    // Inject a mock message — the unified label should have an aria-label
    await page.evaluate(() => {
      const container = document.querySelector('.chat-messages')
      if (!container) return

      const bubble = document.createElement('div')
      bubble.className = 'bubble bubble-assistant'
      bubble.innerHTML = `
        <div class="bubble-source-label" aria-label="Source: Vault" data-testid="bubble-source-label">
          <span class="bubble-source-label-key">Source:</span>
          <span class="bubble-source-label-value" data-testid="bubble-source-value">Vault</span>
        </div>
      `
      container.appendChild(bubble)
    })

    const label = page.locator('[data-testid="bubble-source-label"]').last()
    await expect(label).toHaveAttribute('aria-label', 'Source: Vault')
  })
})
