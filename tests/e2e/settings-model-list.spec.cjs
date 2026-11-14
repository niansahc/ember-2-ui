// Settings > General > Local model list: a failed or hung GET /model must land
// in an error state with a retry, never an endless "Loading models..." and never
// invented models (ADR 0003). The /model endpoint is mocked (ADR 0001); this
// lane proves the UI half. The backend-side hang is G's. Synthetic fixtures only.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const ERROR_COPY = "Couldn't load models."
// Names the retired mock fallback used to invent on failure.
const RETIRED_MOCK_MODELS = ['mistral:7b', 'deepseek-r1:8b', 'llava:13b']

async function openSettings(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  await page.locator('.app-header-btn[aria-label="Open settings"]').click()
  await expect(page.locator('.settings-section-label', { hasText: 'Models' })).toBeVisible()
}

/** Replace GET /model with `handler` (page routes registered later win). */
async function routeModel(page, handler) {
  await page.route('**/model', async (route, request) => {
    if (request.method() !== 'GET' || !/\/model\/?$/.test(new URL(request.url()).pathname)) return route.fallback()
    await handler(route)
  })
}

test.describe('Model list failure states', () => {
  test('no answer: error state with Try again after the timeout, no spinner, no invented models', async ({ page }) => {
    await mockBootstrap(page)
    await routeModel(page, () => new Promise(() => {})) // never answers
    await page.clock.install()
    await openSettings(page)
    await expect(page.getByText('Loading models...')).toBeVisible()
    await page.clock.runFor(9000)
    await expect(page.getByText(ERROR_COPY)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(page.getByText('Loading models...')).toHaveCount(0)
    for (const m of RETIRED_MOCK_MODELS) {
      await expect(page.locator('.model-list-item', { hasText: m })).toHaveCount(0)
    }
    await expect(page.getByText('No local models found')).toHaveCount(0)
  })

  test('500: error state, not the "No local models found" install hint', async ({ page }) => {
    await mockBootstrap(page)
    await routeModel(page, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'synthetic' }) }))
    await openSettings(page)
    await expect(page.getByText(ERROR_COPY)).toBeVisible()
    await expect(page.getByText('No local models found')).toHaveCount(0)
  })

  test('control: a healthy /model shows models and no error; Try again recovers a failed first load', async ({ page }) => {
    // Positive control for the absence assertions in the two tests above: with
    // a healthy /model the same page shows models and no error copy.
    await mockBootstrap(page)
    let calls = 0
    await routeModel(page, (route) => {
      calls += 1
      if (calls === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      return route.fallback()
    })
    await openSettings(page)
    await expect(page.getByText(ERROR_COPY)).toBeVisible()
    await expect(page.locator('.model-list-item')).toHaveCount(0)
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('.model-list-item', { hasText: 'llama3.2:3b' })).toBeVisible()
    await expect(page.getByText(ERROR_COPY)).toHaveCount(0)
    expect(calls).toBe(2)
  })
})
