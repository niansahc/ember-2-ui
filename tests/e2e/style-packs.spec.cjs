// Coverage for the decorative effects each style pack applies on top of
// the shared token layer. Packs are color-agnostic — they override fonts,
// radii, motion, and add pseudo-element content (prefixes, dividers).
//
// We exercise each pack by applying it via the ?style-pack=<id> URL param
// (ephemeral, doesn't touch user prefs) and then reading computed styles
// and custom properties off <html>. The fine decorative details (::before
// content, dashed dividers) live inside specific sub-surfaces of the app;
// we test them on surfaces that are reliably present under mockBootstrap
// without needing real vault data — principally the Settings panel.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

async function openSettings(page) {
  await page.locator('.app-header-btn[aria-label="Open settings"]').click()
  await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })
}

/** Read a CSS custom property value off <html>. */
async function readVar(page, name) {
  return page.evaluate(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  )
}

test.describe('Style packs — token overrides via ?style-pack param', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
    await page.addInitScript(() => { try { localStorage.clear() } catch {} })
  })

  test('OG pack writes its attribute but adds no font/shadow overrides', async ({ page }) => {
    await page.goto('/?style-pack=og')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    await expect(page.locator('html')).toHaveAttribute('data-style-pack', 'og')

    // OG is the baseline — pack-og.css is a stub. Tokens fall through to
    // :root. We don't assert specific :root values here (they may change
    // as the token layer evolves); instead assert the two distinctive
    // markers of other packs are NOT in effect.
    const shadow1 = await readVar(page, '--shadow-1')
    expect(shadow1).not.toBe('none') // Clean sets this to none

    const fontBody = await readVar(page, '--font-body')
    expect(fontBody.toLowerCase()).not.toContain('fraunces') // Hearth
    expect(fontBody.toLowerCase()).not.toContain('jetbrains mono') // Hacker
    expect(fontBody.toLowerCase()).not.toContain('inter,') // Clean starts with Inter
  })

  test('Hearth pack applies Fraunces serif via --font-body', async ({ page }) => {
    await page.goto('/?style-pack=hearth')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    await expect(page.locator('html')).toHaveAttribute('data-style-pack', 'hearth')

    const fontBody = await readVar(page, '--font-body')
    expect(fontBody).toContain('Fraunces Variable')

    const fontDisplay = await readVar(page, '--font-display')
    expect(fontDisplay).toContain('Fraunces Variable')
  })

  test('Cool Hacker pack applies JetBrains Mono via --font-body', async ({ page }) => {
    await page.goto('/?style-pack=hacker')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    await expect(page.locator('html')).toHaveAttribute('data-style-pack', 'hacker')

    const fontBody = await readVar(page, '--font-body')
    expect(fontBody).toContain('JetBrains Mono')
  })

  test('Hacker pack adds ~/ prefix on the vault path row', async ({ page }) => {
    await page.goto('/?style-pack=hacker')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    await openSettings(page)
    await page.locator('.settings-tab', { hasText: 'Memory' }).click()

    // The real selector is .settings-row-path (the recent pack-selector fix
    // migrated off the phantom .vault-path-display). ::before content lives
    // on the computed pseudo style.
    const pathEl = page.locator('.settings-row-path').first()
    await expect(pathEl).toBeVisible({ timeout: 5000 })

    const beforeContent = await pathEl.evaluate((el) =>
      getComputedStyle(el, '::before').content,
    )
    // Computed content values are usually quoted — e.g. '"~/"' — so strip
    // quotes before comparison to avoid brittle escaping.
    expect(beforeContent.replace(/^['"]|['"]$/g, '').replace(/\\/g, '')).toBe('~/')
  })

  test('Clean pack sets --shadow-1 to none', async ({ page }) => {
    await page.goto('/?style-pack=clean')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    await expect(page.locator('html')).toHaveAttribute('data-style-pack', 'clean')

    const shadow = await readVar(page, '--shadow-1')
    expect(shadow).toBe('none')

    const fontBody = await readVar(page, '--font-body')
    expect(fontBody).toContain('Inter')
  })
})
