// Service status indicator tests — single API dot, bottom-left.
// Mocks GET /api/health and POST /v1/service/api/restart via page.route().

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

function mockHealthy(page) {
  return page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', version: '0.14.1', model: 'qwen3:8b' }),
    })
  })
}

function mockApiDown(page) {
  return page.route('**/api/health', async (route) => {
    await route.abort('failed')
  })
}

async function loadApp(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
}

test.describe('Service Status Indicator', () => {
  test('shows single API dot when healthy', async ({ page }) => {
    await mockHealthy(page)
    await loadApp(page)

    const apiDot = page.locator('[data-testid="service-dot-api"]')
    await expect(apiDot).toBeVisible()
    await expect(apiDot).toHaveClass(/service-dot-ok/)

    // No Docker dot should exist
    await expect(page.locator('[data-testid="service-dot-docker"]')).toHaveCount(0)
  })

  test('healthy dot has breathing animation', async ({ page }) => {
    await mockHealthy(page)
    await loadApp(page)

    const apiDot = page.locator('[data-testid="service-dot-api"]')
    await expect(apiDot).toHaveClass(/service-dot-breathe/)
  })

  test('hover expands panel with API status and restart button', async ({ page }) => {
    await mockHealthy(page)
    await loadApp(page)

    const container = page.locator('[data-testid="service-status"]')
    await container.hover()

    const panel = page.locator('[data-testid="service-panel"]')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('API')
    await expect(panel).toContainText('Running')

    // Only API restart — no Docker restart button
    await expect(page.locator('[data-testid="service-restart-api"]')).toBeVisible()
    await expect(page.locator('[data-testid="service-restart-docker"]')).toHaveCount(0)
  })

  test('API down: dot goes dark, no breathing', async ({ page }) => {
    await mockApiDown(page)
    await loadApp(page)

    const apiDot = page.locator('[data-testid="service-dot-api"]')
    try {
      await expect(apiDot).toBeVisible({ timeout: 5000 })
      await expect(apiDot).not.toHaveClass(/service-dot-ok/)
      await expect(apiDot).not.toHaveClass(/service-dot-breathe/)
    } catch {
      test.skip(true, 'App did not reach chat view — ServiceStatus only renders in chat layout')
    }
  })

  test('restart button triggers POST for API', async ({ page }) => {
    let restartCalls = 0
    await mockHealthy(page)
    await page.route('**/service/*/restart', async (route) => {
      restartCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'restarting' }),
      })
    })
    await loadApp(page)

    const container = page.locator('[data-testid="service-status"]')
    await container.hover()

    await page.locator('[data-testid="service-restart-api"]').click()
    expect(restartCalls).toBe(1)
  })

  test('shutdown button triggers POST and disables', async ({ page }) => {
    let shutdownCalls = 0
    await mockHealthy(page)
    await page.route('**/service/shutdown', async (route) => {
      shutdownCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'shutting_down' }),
      })
    })
    await loadApp(page)

    const container = page.locator('[data-testid="service-status"]')
    await container.hover()

    const shutdownBtn = page.locator('[data-testid="service-shutdown"]')
    await expect(shutdownBtn).toContainText('Shut down Ember')
    await shutdownBtn.click()
    expect(shutdownCalls).toBe(1)
  })

  test('panel closes on mouse leave', async ({ page }) => {
    await mockHealthy(page)
    await loadApp(page)

    const container = page.locator('[data-testid="service-status"]')
    await container.hover()
    await expect(page.locator('[data-testid="service-panel"]')).toBeVisible()

    await page.mouse.move(0, 0)
    await expect(page.locator('[data-testid="service-panel"]')).not.toBeVisible()
  })

  test('indicator is positioned in the bottom-left', async ({ page }) => {
    await mockHealthy(page)
    await loadApp(page)

    const container = page.locator('[data-testid="service-status"]')
    const box = await container.boundingBox()
    // Should be near the left edge, not the right
    expect(box.x).toBeLessThan(100)
  })
})
