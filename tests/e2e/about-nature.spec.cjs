const { test, expect } = require('@playwright/test')

test.describe('About Nature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Open the About panel
    const aboutBtn = page.locator('button[aria-label="About Ember"]')
    await aboutBtn.click()
    await expect(page.locator('.about-panel')).toBeVisible({ timeout: 5000 })
  })

  test('nature toggle is visible in the About panel', async ({ page }) => {
    const toggle = page.locator('.about-nature-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toContainText("Ember's nature")
  })

  test('clicking the toggle reveals all 13 facets', async ({ page }) => {
    const toggle = page.locator('.about-nature-toggle')
    await toggle.click()

    const content = page.locator('.about-nature-content')
    await expect(content).toBeVisible()

    const facets = content.locator('.about-nature-facet')
    await expect(facets).toHaveCount(13)

    // Verify first and last facet text
    await expect(facets.first()).toContainText('Sincerity')
    await expect(facets.last()).toContainText('Restraint')
  })

  test('clicking the toggle again collapses the section', async ({ page }) => {
    const toggle = page.locator('.about-nature-toggle')

    // Expand
    await toggle.click()
    await expect(page.locator('.about-nature-content')).toBeVisible()

    // Collapse
    await toggle.click()
    await expect(page.locator('.about-nature-content')).not.toBeVisible()
  })
})
