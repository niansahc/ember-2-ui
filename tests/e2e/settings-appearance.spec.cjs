// Coverage for the Settings > Appearance tab introduced in the style-pack /
// font-scale / density / reduced-motion work. Theme swatches moved here
// from the General tab; a new StylePackPicker, two Segmented controls, and
// a reduced-motion toggle were added. Each user-visible control should
// drive a specific data-* attribute on <html> and persist in localStorage.
//
// These tests REQUIRE the Vite dev server (baseURL :3000) because they
// navigate via URL query params the dev server respects and rely on
// freshly-mounted hook state. Running against a built :8000 bundle is
// unsupported — hooks don't initialize with URL params the same way.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Settings — Appearance tab', () => {
  test.beforeEach(async ({ page }) => {
    // Each test starts with a clean localStorage so hook defaults are
    // observable. Must be set BEFORE goto so readInitial() sees a clean
    // storage on hook mount.
    await mockBootstrap(page)
    await page.addInitScript(() => {
      try { localStorage.clear() } catch {}
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Open settings and navigate to Appearance
    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })
    await page.locator('.settings-tab', { hasText: 'Appearance' }).click()
  })

  test('tab panel mounts with all sections visible', async ({ page }) => {
    // Panel shell — shared id across tabs, but only this one is rendered
    // when activeTab === 'appearance'.
    await expect(page.locator('#settings-panel-appearance')).toBeVisible()

    // Theme swatches (moved here from General)
    await expect(page.locator('.theme-picker[role="radiogroup"]')).toBeVisible()
    await expect(page.locator('.theme-swatch')).toHaveCount(6) // ember, midnight, forest, ocean, bloom, custom

    // Style pack picker — 4 cards
    await expect(page.locator('.style-pack-picker[role="radiogroup"]')).toBeVisible()
    await expect(page.locator('.style-pack-card')).toHaveCount(4)

    // Font size segmented — Small / Medium / Large
    const fontSize = page.locator('.settings-segmented[aria-label="Font size"]')
    await expect(fontSize).toBeVisible()
    await expect(fontSize.locator('.settings-segmented-btn')).toHaveCount(3)

    // Density segmented — Comfortable / Compact
    const density = page.locator('.settings-segmented[aria-label="Density"]')
    await expect(density).toBeVisible()
    await expect(density.locator('.settings-segmented-btn')).toHaveCount(2)

    // Reduced motion toggle
    await expect(page.locator('input[aria-label="Force reduced motion"]')).toBeAttached()
  })

  test('default values reflect a clean state', async ({ page }) => {
    const html = page.locator('html')
    // Defaults: og pack (no style-pack attribute written? actually yes —
    // the hook writes 'og' unconditionally on mount via the effect)
    await expect(html).toHaveAttribute('data-style-pack', 'og')
    await expect(html).toHaveAttribute('data-font-scale', 'md')
    await expect(html).toHaveAttribute('data-density', 'comfortable')
    // Reduced motion: attribute absent by default (hook removes it when off)
    const motion = await html.getAttribute('data-motion')
    expect(motion).toBeNull()
  })

  test('style pack selection writes attribute and localStorage', async ({ page }) => {
    // Click the Hacker card — aria-label is "Cool Hacker — <description>"
    const hackerCard = page.locator('.style-pack-card', { hasText: 'Cool Hacker' })
    await hackerCard.click()

    await expect(page.locator('html')).toHaveAttribute('data-style-pack', 'hacker')
    await expect(hackerCard).toHaveClass(/style-pack-card-active/)
    await expect(hackerCard).toHaveAttribute('aria-checked', 'true')

    const stored = await page.evaluate(() => localStorage.getItem('ember-style-pack'))
    expect(stored).toBe('hacker')
  })

  test('font scale Large sets attribute and ~17.5px root font size', async ({ page }) => {
    const largeBtn = page
      .locator('.settings-segmented[aria-label="Font size"]')
      .locator('.settings-segmented-btn', { hasText: 'Large' })
    await largeBtn.click()

    await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'lg')
    await expect(largeBtn).toHaveAttribute('aria-checked', 'true')

    const rootFontSize = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    )
    // index.css sets html[data-font-scale="lg"] { font-size: 17.5px }
    expect(rootFontSize).toBeCloseTo(17.5, 1)

    const stored = await page.evaluate(() => localStorage.getItem('ember-font-scale'))
    expect(stored).toBe('lg')
  })

  test('density Compact sets attribute and localStorage', async ({ page }) => {
    const compactBtn = page
      .locator('.settings-segmented[aria-label="Density"]')
      .locator('.settings-segmented-btn', { hasText: 'Compact' })
    await compactBtn.click()

    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
    await expect(compactBtn).toHaveAttribute('aria-checked', 'true')

    const stored = await page.evaluate(() => localStorage.getItem('ember-density'))
    expect(stored).toBe('compact')
  })

  test('reduced motion toggle adds and removes the attribute', async ({ page }) => {
    const toggle = page.locator('input[aria-label="Force reduced motion"]')

    // Turn on
    await toggle.check()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
    expect(await page.evaluate(() => localStorage.getItem('ember-reduced-motion'))).toBe('on')

    // Turn off — attribute should be fully removed (not just empty)
    await toggle.uncheck()
    const motion = await page.locator('html').getAttribute('data-motion')
    expect(motion).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('ember-reduced-motion'))).toBe('off')
  })

  test('all four appearance prefs persist across reload', async ({ page }) => {
    // Set one of each
    await page.locator('.style-pack-card', { hasText: 'Clean' }).click()
    await page
      .locator('.settings-segmented[aria-label="Font size"]')
      .locator('.settings-segmented-btn', { hasText: 'Small' })
      .click()
    await page
      .locator('.settings-segmented[aria-label="Density"]')
      .locator('.settings-segmented-btn', { hasText: 'Compact' })
      .click()
    await page.locator('input[aria-label="Force reduced motion"]').check()

    // Reload — hooks read from localStorage on mount
    await page.reload()
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-style-pack', 'clean')
    await expect(html).toHaveAttribute('data-font-scale', 'sm')
    await expect(html).toHaveAttribute('data-density', 'compact')
    await expect(html).toHaveAttribute('data-motion', 'reduce')
  })
})

test.describe('Settings — Appearance URL-param pack override', () => {
  test('?style-pack=hacker applies without writing to localStorage', async ({ page }) => {
    await mockBootstrap(page)
    // Ensure storage starts clean so we can assert the URL param didn't write
    await page.addInitScript(() => {
      try { localStorage.clear() } catch {}
    })
    await page.goto('/?style-pack=hacker')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Attribute applied
    await expect(page.locator('html')).toHaveAttribute('data-style-pack', 'hacker')

    // localStorage untouched — visiting with the param is ephemeral for the
    // session, it must not overwrite the user's saved preference.
    const stored = await page.evaluate(() => localStorage.getItem('ember-style-pack'))
    expect(stored).toBeNull()
  })

  test('invalid ?style-pack value falls through to default', async ({ page }) => {
    await mockBootstrap(page)
    await page.addInitScript(() => {
      try { localStorage.clear() } catch {}
    })
    await page.goto('/?style-pack=nonsense')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Hook's isValidPack filter rejects unknown ids — defaults to 'og'
    await expect(page.locator('html')).toHaveAttribute('data-style-pack', 'og')
  })
})
