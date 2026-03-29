// Requires Ember API running at localhost:8000 (start_api.bat)

const { test, expect } = require('@playwright/test')

test.describe('Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for splash to connect and transition to chat
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('collapses on chevron click', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).not.toHaveClass(/sidebar-collapsed/)

    // Click the collapse chevron (last icon-row-btn when expanded)
    const collapseBtn = sidebar.locator('.sidebar-icon-row-btn').last()
    await collapseBtn.click()

    await expect(sidebar).toHaveClass(/sidebar-collapsed/)
  })

  test('remembers collapsed state after reload', async ({ page }) => {
    const sidebar = page.locator('.sidebar')

    // Collapse the sidebar
    const collapseBtn = sidebar.locator('.sidebar-icon-row-btn').last()
    await collapseBtn.click()
    await expect(sidebar).toHaveClass(/sidebar-collapsed/)

    // Reload
    await page.reload()
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Should still be collapsed
    const sidebarAfter = page.locator('.sidebar')
    await expect(sidebarAfter).toHaveClass(/sidebar-collapsed/)
  })

  test('search icon in collapsed state expands sidebar', async ({ page }) => {
    const sidebar = page.locator('.sidebar')

    // Collapse first
    const collapseBtn = sidebar.locator('.sidebar-icon-row-btn').last()
    await collapseBtn.click()
    await expect(sidebar).toHaveClass(/sidebar-collapsed/)

    // Click the search icon (collapsed order: expand, new, search)
    const searchBtn = sidebar.locator('.sidebar-icon-row-btn[aria-label="Search conversations"]')
    await searchBtn.click()

    // Should expand
    await expect(sidebar).not.toHaveClass(/sidebar-collapsed/)
  })

  test('new conversation icon is present and clickable', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    const newBtn = sidebar.locator('.sidebar-icon-row-btn').first()

    await expect(newBtn).toBeVisible()
    await expect(newBtn).toHaveAttribute('aria-label', 'New conversation')
  })
})
