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

// The greeting module's unit behavior (extractFirstName forms, getGreeting
// buckets, RNG determinism) is covered node-only in src/utils/greeting.test.js
// via Vitest — see issue #21. Those cases previously ran here through
// page.evaluate against the dev server's ESM endpoint; the Vitest port removes
// the dev-server dependency. The integration tests above stay in Playwright.
