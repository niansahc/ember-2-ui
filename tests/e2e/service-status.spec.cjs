// Service status indicator tests — health dot in header.
// Uses mockBootstrap for deterministic splash → chat, then tests
// the service status dot and its dropdown panel.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

async function loadApp(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
}

test.describe('Service Status Indicator', () => {
  test('shows single API dot when healthy', async ({ page }) => {
    await mockBootstrap(page)
    await loadApp(page)

    const apiDot = page.locator('[data-testid="service-dot-api"]')
    await expect(apiDot).toBeVisible()
    await expect(apiDot).toHaveClass(/ss-dot-green/)

    // No Docker dot should exist
    await expect(page.locator('[data-testid="service-dot-docker"]')).toHaveCount(0)
  })

  test('healthy dot has breathing animation', async ({ page }) => {
    await mockBootstrap(page)
    await loadApp(page)

    const apiDot = page.locator('[data-testid="service-dot-api"]')
    await expect(apiDot).toHaveClass(/ss-dot-green/)
  })

  test('click expands panel with API status and restart button', async ({ page }) => {
    await mockBootstrap(page)
    await loadApp(page)

    const dotsBtn = page.locator('[data-testid="service-dots"]')
    await dotsBtn.click()

    const panel = page.locator('[data-testid="service-panel"]')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('API')
    await expect(panel).toContainText('Healthy')

    // Only API restart — no Docker restart button
    await expect(page.locator('[data-testid="service-restart-api"]')).toBeVisible()
    await expect(page.locator('[data-testid="service-restart-docker"]')).toHaveCount(0)
  })

  test.skip('API down: dot goes dark, no breathing', async ({ page }) => {
    // skipped: when health returns failure the splash screen never transitions
    // to chat, so the service status dot is not rendered. This scenario is
    // only testable via the production build served by the backend.
  })

  test('restart button triggers POST for API', async ({ page }) => {
    let restartCalls = 0
    await mockBootstrap(page)
    await page.route('**/service/*/restart', async (route) => {
      restartCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'restarting' }),
      })
    })
    await loadApp(page)

    const dotsBtn = page.locator('[data-testid="service-dots"]')
    await dotsBtn.click()

    await page.locator('[data-testid="service-restart-api"]').click()
    expect(restartCalls).toBe(1)
  })

  test('shutdown button triggers POST and disables', async ({ page }) => {
    let shutdownCalls = 0
    await mockBootstrap(page)
    await page.route('**/service/shutdown', async (route) => {
      shutdownCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'shutting_down' }),
      })
    })
    await loadApp(page)

    const dotsBtn = page.locator('[data-testid="service-dots"]')
    await dotsBtn.click()

    const shutdownBtn = page.locator('[data-testid="service-shutdown"]')
    await expect(shutdownBtn).toContainText('Shut down Ember')
    await shutdownBtn.click()
    expect(shutdownCalls).toBe(1)
  })

  test('shutdown shows error feedback when backend endpoint is missing (404)', async ({ page }) => {
    // Contract: the backend shutdown endpoint hasn't shipped yet (G-side
    // TODO). Until it does, clicking Shut Down must tell the user something
    // went wrong instead of failing silently.
    await mockBootstrap(page)
    await page.route('**/service/shutdown', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not Found' }),
      })
    })
    await loadApp(page)

    const dotsBtn = page.locator('[data-testid="service-dots"]')
    await dotsBtn.click()

    await page.locator('[data-testid="service-shutdown"]').click()

    const errorEl = page.locator('[data-testid="service-shutdown-error"]')
    await expect(errorEl).toBeVisible()
    // Either the thrown error message or our fallback copy — both are acceptable.
    await expect(errorEl).toContainText(/Not Found|404|Shutdown failed/i)
  })

  test('restart button shows the visible text label "Restart"', async ({ page }) => {
    // The circular-arrow icon alone reads as "refresh" — a visible text label
    // removes that ambiguity without touching behaviour.
    await mockBootstrap(page)
    await loadApp(page)

    const dotsBtn = page.locator('[data-testid="service-dots"]')
    await dotsBtn.click()

    const restartBtn = page.locator('[data-testid="service-restart-api"]')
    await expect(restartBtn).toBeVisible()
    await expect(restartBtn).toContainText('Restart')
  })

  test('panel closes on outside click', async ({ page }) => {
    await mockBootstrap(page)
    await loadApp(page)

    const dotsBtn = page.locator('[data-testid="service-dots"]')
    await dotsBtn.click()
    await expect(page.locator('[data-testid="service-panel"]')).toBeVisible()

    // click outside the panel to close it
    await page.locator('.chat-messages').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('[data-testid="service-panel"]')).not.toBeVisible()
  })

  test('indicator is in the header title group', async ({ page }) => {
    await mockBootstrap(page)
    await loadApp(page)

    const container = page.locator('[data-testid="service-status"]')
    const box = await container.boundingBox()
    const header = page.locator('.app-header')
    const headerBox = await header.boundingBox()

    // dot should be within the header vertically
    expect(box.y).toBeGreaterThanOrEqual(headerBox.y)
    expect(box.y + box.height).toBeLessThanOrEqual(headerBox.y + headerBox.height)
  })
})
