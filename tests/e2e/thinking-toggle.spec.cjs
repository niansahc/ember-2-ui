// "Think before replying" toggle (ember-2 PR #316), Settings > General.
//
// The thinking endpoint is mocked (ADR 0001), so this lane proves the UI half
// of the contract: each server state renders the approved copy, a click POSTs
// the flipped value to /v1/settings/thinking and nowhere else, a failed save
// rolls the toggle back with an inline error, and a model switch refetches.
// Synthetic fixtures only.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const COPY = {
  on: 'Takes longer, works through the question first.',
  off: 'Replies faster.',
  unsupported: "This model doesn't support thinking.",
  unknown: "Couldn't check whether this model supports thinking.",
  saveError: "Couldn't save this setting. Try again.",
  loadError: "Couldn't load this setting.",
}

const toggleInput = (page) => page.locator('label[aria-label="Toggle thinking"] input')
// The native input is sr-only (Settings.css `.toggle input`); dispatch the
// DOM click directly, same as ask-first-toggle.spec.cjs.
const clickToggle = (page) => toggleInput(page).evaluate((el) => el.click())

async function openSettings(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  await page.locator('.app-header-btn[aria-label="Open settings"]').click()
  await expect(page.locator('.settings-row-label', { hasText: 'Think before replying' })).toBeVisible()
}

/** Mock POST /v1/settings/thinking; records bodies. GET falls back to mockBootstrap. */
async function mockPost(page, { status = 200, body } = {}) {
  const posts = []
  await page.route('**/v1/settings/thinking', async (route, request) => {
    if (request.method() !== 'POST') return route.fallback()
    const sent = request.postDataJSON()
    posts.push(sent)
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(
        body || (status === 200
          ? { enabled: sent.enabled, model: 'qwen3:8b', supported: true, cloud: false }
          : { detail: 'synthetic' }),
      ),
    })
  })
  return posts
}

test.describe('Thinking toggle: states', () => {
  test('supported, on', async ({ page }) => {
    await mockBootstrap(page, { thinking: { enabled: true } })
    await openSettings(page)
    await expect(toggleInput(page)).toBeChecked()
    await expect(toggleInput(page)).toBeEnabled()
    await expect(page.getByText(COPY.on)).toBeVisible()
  })

  test('supported, off', async ({ page }) => {
    await mockBootstrap(page, { thinking: { enabled: false } })
    await openSettings(page)
    await expect(toggleInput(page)).not.toBeChecked()
    await expect(toggleInput(page)).toBeEnabled()
    await expect(page.getByText(COPY.off)).toBeVisible()
  })

  test('supported false: disabled with unsupported copy', async ({ page }) => {
    await mockBootstrap(page, { thinking: { supported: false } })
    await openSettings(page)
    await expect(toggleInput(page)).toBeDisabled()
    await expect(page.getByText(COPY.unsupported)).toBeVisible()
  })

  test('cloud true: disabled with unsupported copy', async ({ page }) => {
    await mockBootstrap(page, { thinking: { cloud: true, supported: true } })
    await openSettings(page)
    await expect(toggleInput(page)).toBeDisabled()
    await expect(page.getByText(COPY.unsupported)).toBeVisible()
  })

  test('supported null: toggle stays enabled with couldn\'t-check copy', async ({ page }) => {
    await mockBootstrap(page, { thinking: { supported: null } })
    await openSettings(page)
    await expect(toggleInput(page)).toBeEnabled()
    await expect(page.getByText(COPY.unknown)).toBeVisible()
  })

  test('GET failure: disabled with load-error copy', async ({ page }) => {
    await mockBootstrap(page)
    await page.route('**/v1/settings/thinking', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'synthetic' }) }))
    await openSettings(page)
    await expect(toggleInput(page)).toBeDisabled()
    await expect(page.getByText(COPY.loadError)).toBeVisible()
  })

  test('no internal field names are rendered', async ({ page }) => {
    await mockBootstrap(page, { thinking: { enabled: true } })
    await openSettings(page)
    const row = page.locator('.settings-row', { has: page.locator('label[aria-label="Toggle thinking"]') })
    const text = await row.innerText()
    for (const internal of ['enabled', 'supported', 'cloud', 'qwen3']) {
      expect(text.toLowerCase()).not.toContain(internal)
    }
  })

  test('row sits under the model picker', async ({ page }) => {
    await mockBootstrap(page)
    await openSettings(page)
    const list = await page.locator('.model-list').boundingBox()
    const row = await page.locator('.settings-row', { has: page.locator('label[aria-label="Toggle thinking"]') }).boundingBox()
    expect(row.y).toBeGreaterThan(list.y + list.height - 1)
  })
})

test.describe('Thinking toggle: writes', () => {
  test('click POSTs the flipped value and reflects the response', async ({ page }) => {
    await mockBootstrap(page, { thinking: { enabled: false } })
    const posts = await mockPost(page)
    const prefsWrites = []
    page.on('request', (r) => {
      if (r.url().includes('/v1/preferences') && r.method() !== 'GET') prefsWrites.push(r.method())
    })
    await openSettings(page)
    await clickToggle(page)
    await expect(toggleInput(page)).toBeChecked()
    await expect(page.getByText(COPY.on)).toBeVisible()
    expect(posts).toEqual([{ enabled: true }])
    expect(prefsWrites).toEqual([])
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('control: the preferences recorder does catch a real preferences write', async ({ page }) => {
    // Positive control for the "no PATCH to /v1/preferences" assertion above.
    await mockBootstrap(page)
    const prefsWrites = []
    page.on('request', (r) => {
      if (r.url().includes('/v1/preferences') && r.method() !== 'GET') prefsWrites.push(r.method())
    })
    await page.route('**/v1/preferences', (route, req) =>
      req.method() === 'PATCH'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        : route.fallback())
    await openSettings(page)
    await page.locator('.settings-tab', { hasText: 'Features' }).click()
    await page.locator('label[aria-label="Toggle deviation detection"] input').evaluate((el) => el.click())
    await expect.poll(() => prefsWrites).toEqual(['PATCH'])
  })

  for (const status of [500, 400]) {
    test(`POST ${status}: toggle rolls back and shows the save error`, async ({ page }) => {
      await mockBootstrap(page, { thinking: { enabled: false } })
      const posts = await mockPost(page, { status })
      await openSettings(page)
      await clickToggle(page)
      await expect(page.getByRole('alert')).toHaveText(COPY.saveError)
      await expect(toggleInput(page)).not.toBeChecked()
      await expect(page.getByText(COPY.off)).toBeVisible()
      expect(posts).toEqual([{ enabled: true }])
      // Rolled back, so the toggle is usable again.
      await expect(toggleInput(page)).toBeEnabled()
    })
  }

  test('rollback also restores an on -> off attempt', async ({ page }) => {
    await mockBootstrap(page, { thinking: { enabled: true } })
    await mockPost(page, { status: 500 })
    await openSettings(page)
    await clickToggle(page)
    await expect(page.getByRole('alert')).toHaveText(COPY.saveError)
    await expect(toggleInput(page)).toBeChecked()
    await expect(page.getByText(COPY.on)).toBeVisible()
  })

  test('a network failure on POST rolls back too', async ({ page }) => {
    await mockBootstrap(page, { thinking: { enabled: false } })
    await page.route('**/v1/settings/thinking', (route, req) =>
      req.method() === 'POST' ? route.abort() : route.fallback())
    await openSettings(page)
    await clickToggle(page)
    await expect(page.getByRole('alert')).toHaveText(COPY.saveError)
    await expect(toggleInput(page)).not.toBeChecked()
  })
})

test.describe('Thinking toggle: model change and viewport', () => {
  test('switching the model refetches the thinking state', async ({ page }) => {
    await mockBootstrap(page)
    let model = 'qwen3:8b'
    await page.route('**/model', (route, req) => {
      if (!/\/model\/?$/.test(new URL(req.url()).pathname)) return route.fallback()
      if (req.method() === 'POST') model = JSON.parse(req.postData() || '{}').model
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ model, available: ['qwen3:8b', 'llama3.2:3b'], vision_model: null }),
      })
    })
    const gets = []
    await page.route('**/v1/settings/thinking', (route, req) => {
      if (req.method() !== 'GET') return route.fallback()
      gets.push(model)
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(model === 'qwen3:8b'
          ? { enabled: true, model, supported: true, cloud: false }
          : { enabled: true, model, supported: false, cloud: false }),
      })
    })
    await openSettings(page)
    await expect(page.getByText(COPY.on)).toBeVisible()
    expect(gets).toEqual(['qwen3:8b'])

    await page.locator('.model-list-item', { hasText: 'llama3.2:3b' }).click()
    await expect(page.getByText(COPY.unsupported)).toBeVisible()
    await expect(toggleInput(page)).toBeDisabled()
    expect(gets).toEqual(['qwen3:8b', 'llama3.2:3b'])
  })

  test('row is visible and unclipped at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    const label = page.locator('.settings-row-label', { hasText: 'Think before replying' })
    await label.scrollIntoViewIfNeeded()
    await expect(label).toBeVisible()
    const box = await page.locator('label[aria-label="Toggle thinking"]').boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(375)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  })
})
