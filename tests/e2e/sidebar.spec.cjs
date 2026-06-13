const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

// Synthetic project so the project-detail tests render a `.sidebar-project-row`
// deterministically (per ADR 0001 — no live vault data required).
const PROJECT = {
  id: 'proj_sidebar01',
  name: 'Synthetic Project',
  color: '#ff8c00',
  conversation_count: 0,
}

test.describe('Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page, { projects: [PROJECT] })
    await page.goto('/')
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

  test('project detail view has icon row when collapsed', async ({ page }) => {
    const sidebar = page.locator('.sidebar')

    const projectRow = sidebar.locator('.sidebar-project-row').first()
    await expect(projectRow).toBeVisible()

    // Click into the project
    await projectRow.click()

    // Should now be in project detail view (back button visible)
    const backBtn = sidebar.locator('.sidebar-back-btn')
    await expect(backBtn).toBeVisible()

    // Collapse the sidebar
    const collapseBtn = sidebar.locator('.sidebar-icon-row-btn').last()
    await collapseBtn.click()
    await expect(sidebar).toHaveClass(/sidebar-collapsed/)

    // Icon row should still be visible with new conversation and search icons
    const newBtn = sidebar.locator('.sidebar-icon-row-btn[aria-label="New conversation"]')
    await expect(newBtn).toBeVisible()

    const searchBtn = sidebar.locator('.sidebar-icon-row-btn[aria-label="Search conversations"]')
    await expect(searchBtn).toBeVisible()

    const expandBtn = sidebar.locator('.sidebar-icon-row-btn[aria-label="Expand sidebar"]')
    await expect(expandBtn).toBeVisible()
  })

  test('project detail view search icon expands sidebar', async ({ page }) => {
    const sidebar = page.locator('.sidebar')

    const projectRow = sidebar.locator('.sidebar-project-row').first()
    await expect(projectRow).toBeVisible()

    await projectRow.click()

    // Collapse
    const collapseBtn = sidebar.locator('.sidebar-icon-row-btn').last()
    await collapseBtn.click()
    await expect(sidebar).toHaveClass(/sidebar-collapsed/)

    // Click search icon — should expand
    const searchBtn = sidebar.locator('.sidebar-icon-row-btn[aria-label="Search conversations"]')
    await searchBtn.click()
    await expect(sidebar).not.toHaveClass(/sidebar-collapsed/)
  })
})
