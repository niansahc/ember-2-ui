// WCAG 2.1 AA accessibility regression suite. Runs axe-core against each
// major surface and fails on serious/critical impact only — moderate/minor
// findings are logged for the audit report but don't gate the build.
//
// To re-baseline after intentional UI changes, run:
//   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/a11y.spec.cjs --reporter=list
//
// Per docs/wcag-audit.md, this suite is the regression gate; the audit
// document captures the "moderate/minor" backlog that won't fail tests.

const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

// WCAG 2.1 conformance levels A and AA. We deliberately exclude AAA tags
// (e.g. wcag2aaa, wcag21aaa) — those are aspirational, not the audit target.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function scan(page, opts = {}) {
  let builder = new AxeBuilder({ page }).withTags(TAGS)
  if (opts.include) builder = builder.include(opts.include)
  if (opts.exclude) builder = builder.exclude(opts.exclude)
  return builder.analyze()
}

function fmt(violations) {
  return violations
    .map((v) => {
      const targets = v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n      ')
      return `  [${v.impact}] ${v.id}: ${v.help}\n    ${v.helpUrl}\n    nodes (${v.nodes.length}):\n      ${targets}`
    })
    .join('\n')
}

function blocking(violations) {
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

function nonBlocking(violations) {
  return violations.filter((v) => v.impact === 'moderate' || v.impact === 'minor')
}

// Centralized assertion + reporting. Always logs the full violation list so
// re-runs surface the audit backlog; only fails on serious/critical.
function assertA11y(label, results) {
  const block = blocking(results.violations)
  const warn = nonBlocking(results.violations)
  if (warn.length > 0) {
    console.log(`\n[a11y:${label}] ${warn.length} non-blocking finding(s):\n${fmt(warn)}`)
  }
  if (block.length > 0) {
    console.log(`\n[a11y:${label}] ${block.length} BLOCKING finding(s):\n${fmt(block)}`)
  }
  expect(block, `${label}: serious/critical a11y violations`).toEqual([])
}

test.describe('A11y — chat surface', () => {
  test('empty chat (default mocked bootstrap)', async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    assertA11y('chat-empty', await scan(page))
  })

  test('sidebar expanded', async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    // Sidebar is open by default on desktop viewport
    await expect(page.locator('.sidebar')).toBeVisible()
    assertA11y('sidebar-expanded', await scan(page, { include: '.sidebar' }))
  })
})

test.describe('A11y — settings tabs', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })
  })

  test('General tab', async ({ page }) => {
    await page.locator('.settings-tab', { hasText: 'General' }).click()
    assertA11y('settings-general', await scan(page, { include: '.settings-page' }))
  })

  test('Appearance tab', async ({ page }) => {
    const appearance = page.locator('.settings-tab', { hasText: 'Appearance' })
    if (await appearance.count() === 0) test.skip(true, 'Appearance tab not present')
    await appearance.click()
    assertA11y('settings-appearance', await scan(page, { include: '.settings-page' }))
  })

  test('Security tab', async ({ page }) => {
    await page.locator('.settings-tab', { hasText: 'Security' }).click()
    assertA11y('settings-security', await scan(page, { include: '.settings-page' }))
  })

  test('Memory tab', async ({ page }) => {
    await page.locator('.settings-tab', { hasText: 'Memory' }).click()
    assertA11y('settings-memory', await scan(page, { include: '.settings-page' }))
  })

  test('Features tab', async ({ page }) => {
    await page.locator('.settings-tab', { hasText: 'Features' }).click()
    assertA11y('settings-features', await scan(page, { include: '.settings-page' }))
  })

  test('About tab', async ({ page }) => {
    await page.locator('.settings-tab', { hasText: 'About' }).click()
    assertA11y('settings-about', await scan(page, { include: '.settings-page' }))
  })
})

test.describe('A11y — modals + overlays', () => {
  test('bug report modal', async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })
    await page.locator('.settings-tab', { hasText: 'About' }).click()
    await page.locator('.settings-link-btn', { hasText: 'Report a bug' }).click()
    await expect(page.locator('.bugreport-modal')).toBeVisible({ timeout: 5000 })
    assertA11y('bug-report', await scan(page, { include: '.bugreport-modal' }))
  })
})

test.describe('A11y — full-screen flows', () => {
  test('lock screen (PIN entry)', async ({ page }) => {
    // Lock-on-launch path: PIN is set + lock_on_launch true → LockScreen renders
    await mockBootstrap(page, {
      pinStatus: { pin_set: true },
      preferences: { lock_on_launch: true },
    })
    await page.goto('/')
    await expect(page.locator('.lock-overlay')).toBeVisible({ timeout: 15000 })
    assertA11y('lock-screen', await scan(page))
  })

  test('lock screen (recovery form)', async ({ page }) => {
    await mockBootstrap(page, {
      pinStatus: { pin_set: true },
      preferences: { lock_on_launch: true },
    })
    await page.goto('/')
    await expect(page.locator('.lock-overlay')).toBeVisible({ timeout: 15000 })
    await page.locator('.lock-link', { hasText: 'Forgot PIN?' }).click()
    await expect(page.locator('input[placeholder="Recovery passphrase"]')).toBeVisible()
    assertA11y('lock-recovery', await scan(page))
  })

  test('PIN setup intro', async ({ page }) => {
    // PIN setup path: pin_set=false, dismissed=false, tour_complete=true
    await mockBootstrap(page, {
      pinStatus: { pin_set: false },
      preferences: {
        first_run_tour_complete: true,
        pin_setup_dismissed: false,
      },
    })
    await page.goto('/')
    await expect(page.locator('.pin-setup-overlay')).toBeVisible({ timeout: 15000 })
    assertA11y('pin-setup-intro', await scan(page))
  })

  test('PIN setup form', async ({ page }) => {
    await mockBootstrap(page, {
      pinStatus: { pin_set: false },
      preferences: {
        first_run_tour_complete: true,
        pin_setup_dismissed: false,
      },
    })
    await page.goto('/')
    await expect(page.locator('.pin-setup-overlay')).toBeVisible({ timeout: 15000 })
    await page.locator('.pin-setup-btn-primary', { hasText: 'Set up PIN' }).click()
    await expect(page.locator('.pin-setup-form')).toBeVisible()
    assertA11y('pin-setup-form', await scan(page))
  })

  test('onboarding step 1 (profile)', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { onboarding_complete: false },
    })
    await page.goto('/')
    await expect(page.locator('.onboarding')).toBeVisible({ timeout: 15000 })
    assertA11y('onboarding-step-1', await scan(page))
  })

  test('onboarding step 2 (lodestone gate)', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: { onboarding_complete: false },
    })
    await page.goto('/')
    await expect(page.locator('.onboarding')).toBeVisible({ timeout: 15000 })
    await page.locator('.onboarding-btn-skip', { hasText: 'Skip all' }).click()
    await expect(page.locator('.onboarding-title')).toContainText(/Lodestone/i)
    assertA11y('onboarding-step-2', await scan(page))
  })
})
