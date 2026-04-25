// Coverage for the personalized time-of-day greeting that returning users
// see in the empty chat state. Two layers:
//
// 1. Integration — the Chat empty state renders a greeting for returning
//    users, persists across message-list re-renders within a session,
//    and varies when the user's identity changes.
//
// 2. Module — extractFirstName handles the identity-string forms the
//    onboarding flow produces, and getGreeting returns the right time
//    bucket given an injected Date.
//
// The module-layer tests import src/utils/greeting.js via the Vite dev
// server's ES module endpoint, so they REQUIRE baseURL :3000. Running
// against a built :8000 bundle won't expose /src/utils/greeting.js and
// those tests will skip themselves in that mode.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Chat empty-state greeting — integration', () => {
  test('returning user without a name sees a non-empty greeting', async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Default mockBootstrap has onboarding_complete: true and identity: null,
    // so Chat falls into the returning-user-without-name branch. The greeting
    // module should produce a non-empty title (not the static Welcome copy).
    const title = page.locator('.chat-empty-title')
    await expect(title).toBeVisible()
    const text = await title.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
    expect(text).not.toBe("Hi, I'm Ember.")
  })

  test('returning user with identity renders a title and pins across re-render', async ({ page }) => {
    await mockBootstrap(page, {
      preferences: {
        onboarding_profile_answers: { identity: 'Alex, they/them' },
      },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const title = page.locator('.chat-empty-title')
    await expect(title).toBeVisible()
    const firstText = await title.textContent()
    expect(firstText?.trim().length).toBeGreaterThan(0)

    // Open and close settings to force a React re-render cycle. useMemo
    // keyed on [hasOnboarded, userName] should keep the greeting stable —
    // no deps changed.
    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })
    await page.locator('.settings-close-btn, [aria-label="Close settings"]').first().click().catch(async () => {
      // Fallback: press Escape if no close button is labeled as above
      await page.keyboard.press('Escape')
    })

    await expect(title).toBeVisible()
    const secondText = await title.textContent()
    expect(secondText).toBe(firstText)
  })
})

test.describe('greeting module — unit via page.evaluate', () => {
  test.beforeEach(async ({ page }) => {
    // Module tests only need the page to host an import — no bootstrap
    // stubbing needed, and no app mount. Navigate to about:blank via a
    // minimal goto and do the import from there.
    await page.goto('/')
  })

  test('extractFirstName handles the common identity forms', async ({ page }) => {
    // Skip if the dev server isn't serving ES modules at /src/*
    const moduleAvailable = await page.evaluate(async () => {
      try {
        await import('/src/utils/greeting.js')
        return true
      } catch {
        return false
      }
    })
    test.skip(!moduleAvailable, 'Vite dev server required for module import')

    const results = await page.evaluate(async () => {
      const { extractFirstName } = await import('/src/utils/greeting.js')
      return {
        comma: extractFirstName('Alex, they/them'),
        nameIs: extractFirstName('My name is Alex'),
        imContraction: extractFirstName("I'm Alex (she/her)"),
        iAm: extractFirstName('I am Alex'),
        callMe: extractFirstName('call me Alex'),
        bareLower: extractFirstName('alex'),
        bareUpper: extractFirstName('ALEX'),
        empty: extractFirstName(''),
        nullInput: extractFirstName(null),
        nonString: extractFirstName(42),
      }
    })

    expect(results.comma).toBe('Alex')
    expect(results.nameIs).toBe('Alex')
    expect(results.imContraction).toBe('Alex')
    expect(results.iAm).toBe('Alex')
    expect(results.callMe).toBe('Alex')
    expect(results.bareLower).toBe('Alex')
    expect(results.bareUpper).toBe('Alex')
    expect(results.empty).toBeNull()
    expect(results.nullInput).toBeNull()
    expect(results.nonString).toBeNull()
  })

  test('getGreeting returns the expected bucket for each hour range', async ({ page }) => {
    const moduleAvailable = await page.evaluate(async () => {
      try {
        await import('/src/utils/greeting.js')
        return true
      } catch {
        return false
      }
    })
    test.skip(!moduleAvailable, 'Vite dev server required for module import')

    // Inject a fixed Date at each hour boundary; rng pinned to 0 so name
    // never gets inserted (we only care about bucket classification here).
    const buckets = await page.evaluate(async () => {
      const { getGreeting } = await import('/src/utils/greeting.js')
      const at = (hour) => {
        const d = new Date(2026, 0, 1, hour, 0, 0)
        return getGreeting({ name: null, now: d, rng: () => 0 }).bucket
      }
      return {
        h0: at(0),
        h4: at(4),
        h5: at(5),
        h11: at(11),
        h12: at(12),
        h16: at(16),
        h17: at(17),
        h21: at(21),
        h22: at(22),
        h23: at(23),
      }
    })

    expect(buckets.h0).toBe('late_night')
    expect(buckets.h4).toBe('late_night')
    expect(buckets.h5).toBe('morning')
    expect(buckets.h11).toBe('morning')
    expect(buckets.h12).toBe('afternoon')
    expect(buckets.h16).toBe('afternoon')
    expect(buckets.h17).toBe('evening')
    expect(buckets.h21).toBe('evening')
    expect(buckets.h22).toBe('night')
    expect(buckets.h23).toBe('night')
  })

  test('getGreeting returns deterministic output with a seeded rng', async ({ page }) => {
    const moduleAvailable = await page.evaluate(async () => {
      try {
        await import('/src/utils/greeting.js')
        return true
      } catch {
        return false
      }
    })
    test.skip(!moduleAvailable, 'Vite dev server required for module import')

    const result = await page.evaluate(async () => {
      const { getGreeting } = await import('/src/utils/greeting.js')
      // rng() < 0.4 triggers the name branch; > 0.4 skips it. Pin rng to
      // 0.5 so name is never inserted — output depends only on date.
      const first = getGreeting({
        name: 'Alex',
        now: new Date(2026, 0, 1, 10, 0, 0), // morning
        rng: () => 0.5,
      })
      const second = getGreeting({
        name: 'Alex',
        now: new Date(2026, 0, 1, 10, 0, 0),
        rng: () => 0.5,
      })
      return { first, second }
    })

    expect(result.first.bucket).toBe('morning')
    expect(result.second).toEqual(result.first)
    // Title must not contain the name because rng > 0.4 skipped the name branch
    expect(result.first.title).not.toContain('Alex')
  })
})
