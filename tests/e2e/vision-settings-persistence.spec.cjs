// Vision settings persistence — issue #131.
//
// The two vision controls in Settings > Features used to write to
// localStorage and nowhere else, so they were browser-scoped: lost on a
// vault swap, invisible to the backend, gone on a clean install. They now
// round-trip through PATCH /v1/preferences like every other behavior toggle
// in that panel.
//
// What this lane proves: the client reads vision state from the preferences
// response, writes changes back to it, no longer touches localStorage, and
// promotes any pre-existing localStorage values exactly once. Per ADR 0001
// the endpoint is mocked, so this proves the UI half of the contract only.
//
// Scope note: persisting `vision_enabled: false` does not yet stop the
// backend from analyzing an attached image — it gates on image presence
// alone. Making the preference functional is separate backend work.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

// The vision dropdown is populated by filtering the /model `available` list
// for names containing "vision" or "llava" (Settings.jsx). A select whose
// value has no matching option renders blank, so any test asserting the
// dropdown has to stock the list.
const MODELS_WITH_VISION = {
  available: ['qwen3:8b', 'llama3.2-vision:11b', 'llava:13b'],
}

/** Record every PATCH body sent to /v1/preferences, off the wire. */
function capturePatches(page) {
  const bodies = []
  page.on('request', (req) => {
    if (req.url().includes('/v1/preferences') && req.method() === 'PATCH') {
      try {
        bodies.push(req.postDataJSON())
      } catch {}
    }
  })
  return bodies
}

/** Seed the pre-#131 localStorage keys before any app script runs. */
async function seedLegacy(page, { enabled, model }) {
  await page.addInitScript(
    ([e, m]) => {
      if (e !== null) localStorage.setItem('ember-vision-enabled', e)
      if (m !== null) localStorage.setItem('ember-vision-model', m)
    },
    [enabled ?? null, model ?? null],
  )
}

async function openFeaturesTab(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  await page.locator('.app-header-btn[aria-label="Open settings"]').click()
  await page.locator('.settings-tab', { hasText: 'Features' }).click()
}

const visionToggle = (page) =>
  page.locator('label[aria-label="Toggle vision model"] input')
const visionSelect = (page) => page.locator('select[aria-label="Vision model"]')

test.describe('Vision Settings Persistence', () => {
  test('toggle renders from preferences, not localStorage', async ({ page }) => {
    await mockBootstrap(page, { preferences: { vision_enabled: false } })
    await openFeaturesTab(page)

    await expect(visionToggle(page)).not.toBeChecked()
    // The nested model row is conditional on visionEnabled.
    await expect(visionSelect(page)).toHaveCount(0)
  })

  test('model dropdown renders the value from preferences', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { vision_enabled: true, vision_model: 'llava:13b' },
      model: MODELS_WITH_VISION,
    })
    await openFeaturesTab(page)

    await expect(visionToggle(page)).toBeChecked()
    await expect(visionSelect(page)).toHaveValue('llava:13b')
  })

  test('toggling vision PATCHes /v1/preferences with vision_enabled flipped', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { vision_enabled: true, vision_model: 'llava:13b' },
      model: MODELS_WITH_VISION,
    })
    const patchBodies = capturePatches(page)
    await openFeaturesTab(page)

    const toggle = visionToggle(page)
    await expect(toggle).toBeChecked()

    // The native <input> is sr-only with width/height:0 (Settings.css
    // `.toggle input`), so a normal click() trips Playwright's viewport
    // check. Calling the element's own .click() dispatches the default
    // action, which fires React's onChange.
    await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes('/v1/preferences') && req.method() === 'PATCH',
      ),
      toggle.evaluate((el) => el.click()),
    ])

    expect(patchBodies).toHaveLength(1)
    expect(patchBodies[0]).toEqual({ vision_enabled: false })
    await expect(toggle).not.toBeChecked()
  })

  test('changing the model PATCHes /v1/preferences with vision_model', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { vision_enabled: true, vision_model: 'llama3.2-vision:11b' },
      model: MODELS_WITH_VISION,
    })
    const patchBodies = capturePatches(page)
    await openFeaturesTab(page)

    const select = visionSelect(page)
    await expect(select).toHaveValue('llama3.2-vision:11b')

    await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes('/v1/preferences') && req.method() === 'PATCH',
      ),
      select.selectOption('llava:13b'),
    ])

    expect(patchBodies).toHaveLength(1)
    expect(patchBodies[0]).toEqual({ vision_model: 'llava:13b' })
    await expect(select).toHaveValue('llava:13b')
  })

  test('changing vision settings no longer writes to localStorage', async ({ page }) => {
    await seedLegacy(page, { enabled: 'true', model: 'llama3.2-vision:11b' })
    await mockBootstrap(page, {
      preferences: { vision_enabled: true, vision_model: 'llama3.2-vision:11b' },
      model: MODELS_WITH_VISION,
    })
    await openFeaturesTab(page)

    await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes('/v1/preferences') && req.method() === 'PATCH',
      ),
      visionToggle(page).evaluate((el) => el.click()),
    ])
    await expect(visionToggle(page)).not.toBeChecked()

    // The seeded values are left untouched — the toggle went to the backend.
    const stored = await page.evaluate(() => ({
      enabled: localStorage.getItem('ember-vision-enabled'),
      model: localStorage.getItem('ember-vision-model'),
    }))
    expect(stored).toEqual({ enabled: 'true', model: 'llama3.2-vision:11b' })
  })

  test('preferences win over a conflicting localStorage value', async ({ page }) => {
    await seedLegacy(page, { enabled: 'false', model: 'llava:13b' })
    await mockBootstrap(page, {
      preferences: { vision_enabled: true, vision_model: 'llama3.2-vision:11b' },
      model: MODELS_WITH_VISION,
    })
    const patchBodies = capturePatches(page)
    await openFeaturesTab(page)

    await expect(visionToggle(page)).toBeChecked()
    await expect(visionSelect(page)).toHaveValue('llama3.2-vision:11b')
    // Nothing to promote — the backend already knows.
    expect(patchBodies).toHaveLength(0)
  })

  test('legacy localStorage values are promoted once when preferences has no vision keys', async ({ page }) => {
    await seedLegacy(page, { enabled: 'false', model: 'llava:13b' })
    await mockBootstrap(page, { model: MODELS_WITH_VISION })

    // mockBootstrap's default fixture now carries the vision keys, which is
    // what the steady state looks like. Override it with a pre-#131 response
    // that omits them. Registered after mockBootstrap on purpose — Playwright
    // matches routes in reverse registration order, so this one wins.
    await page.route('**/v1/preferences', async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          first_run_tour_complete: true,
          onboarding_complete: true,
          pin_setup_dismissed: true,
          conversational_style: 'balanced',
        }),
      })
    })

    const patchBodies = capturePatches(page)
    await openFeaturesTab(page)

    // Rendered from the legacy values...
    await expect(visionToggle(page)).not.toBeChecked()
    // ...and pushed up to the vault in a single write carrying both keys.
    await expect.poll(() => patchBodies.length).toBe(1)
    expect(patchBodies[0]).toEqual({
      vision_enabled: false,
      vision_model: 'llava:13b',
    })
  })
})
