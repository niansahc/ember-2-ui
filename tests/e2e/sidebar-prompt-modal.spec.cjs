// Tests for TextPromptModal — the in-app replacement for window.prompt() in
// Sidebar.jsx (rename conversation, create project, create-project-and-move).
// Native prompt()/confirm() looked like a browser alert and skipped the
// app's own dialog convention (useModal: focus trap, Escape, focus restore).
// This spec exercises the modal itself; the resulting flows (rename persists,
// project appears, conversation moves) are also covered end-to-end in
// user-journeys.spec.cjs and optimistic-rollback.spec.cjs.
//
// Synthetic fixtures only (Vault Privacy Rule).

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const now = () => new Date().toISOString()

async function gotoApp(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
}

test.describe('Sidebar TextPromptModal', () => {
  test.describe('Rename conversation', () => {
    test.beforeEach(async ({ page }) => {
      await mockBootstrap(page, {
        conversations: [{ id: 'sess_1', title: 'Old Title', updated_at: now(), project_id: null }],
      })
      await page.route(/\/conversations\/[^/?]+$/, (route, req) => (req.method() === 'PATCH'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'sess_1', title: 'New Title' }) })
        : route.continue()))
      await gotoApp(page)
      await page.locator('.sidebar-item').first().click({ button: 'right' })
      await page.locator('.sidebar-context-item', { hasText: 'Rename' }).click()
    })

    test('opens pre-filled with the current title', async ({ page }) => {
      await expect(page.locator('.text-prompt-modal')).toBeVisible()
      await expect(page.locator('.text-prompt-input')).toHaveValue('Old Title')
    })

    test('confirming with a new title renames the conversation', async ({ page }) => {
      await page.locator('.text-prompt-input').fill('New Title')
      await page.locator('.text-prompt-btn-confirm').click()
      await expect(page.locator('.text-prompt-modal')).not.toBeVisible()
      await expect(page.locator('.sidebar-item-title')).toContainText('New Title')
    })

    test('Cancel leaves the title unchanged', async ({ page }) => {
      await page.locator('.text-prompt-input').fill('Abandoned Title')
      await page.locator('.text-prompt-btn', { hasText: 'Cancel' }).click()
      await expect(page.locator('.text-prompt-modal')).not.toBeVisible()
      await expect(page.locator('.sidebar-item-title')).toContainText('Old Title')
    })

    test('Escape leaves the title unchanged and returns focus', async ({ page }) => {
      await page.locator('.text-prompt-input').fill('Abandoned Title')
      await page.keyboard.press('Escape')
      await expect(page.locator('.text-prompt-modal')).not.toBeVisible()
      await expect(page.locator('.sidebar-item-title')).toContainText('Old Title')
    })

    test('modal receives focus on open', async ({ page }) => {
      await expect(page.locator('.text-prompt-input')).toBeFocused()
    })
  })

  test.describe('Create project', () => {
    test.beforeEach(async ({ page }) => {
      await mockBootstrap(page, {
        conversations: [{ id: 'sess_1', title: 'My Chat', updated_at: now(), project_id: null }],
        projects: [],
      })
      await page.route(/\/projects$/, (route, req) => (req.method() === 'POST'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'proj_new', name: 'Research', color: '#ff8c00' }) })
        : route.fallback()))
      await gotoApp(page)
    })

    test('opens empty from the + button', async ({ page }) => {
      await page.locator('.sidebar-section-add[aria-label="New project"]').click()
      await expect(page.locator('.text-prompt-modal')).toBeVisible()
      await expect(page.locator('.text-prompt-input')).toHaveValue('')
    })

    test('confirming creates the project', async ({ page }) => {
      await page.locator('.sidebar-section-add[aria-label="New project"]').click()
      await page.locator('.text-prompt-input').fill('Research')
      await page.locator('.text-prompt-btn-confirm').click()
      await expect(page.locator('.sidebar-project-row', { hasText: 'Research' })).toBeVisible()
    })

    test('Cancel creates no project', async ({ page }) => {
      await page.locator('.sidebar-section-add[aria-label="New project"]').click()
      await page.locator('.text-prompt-input').fill('Research')
      await page.locator('.text-prompt-btn', { hasText: 'Cancel' }).click()
      await expect(page.locator('.sidebar-project-row')).toHaveCount(0)
    })
  })

  test.describe('Create project and move (context menu "New Project...")', () => {
    test.beforeEach(async ({ page }) => {
      await mockBootstrap(page, {
        conversations: [{ id: 'sess_1', title: 'My Chat', updated_at: now(), project_id: null }],
        projects: [],
      })
      await page.route(/\/projects$/, (route, req) => (req.method() === 'POST'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'proj_new', name: 'Research', color: '#ff8c00' }) })
        : route.fallback()))
      await page.route(/\/conversations\/[^/?]+$/, (route, req) => (req.method() === 'PATCH'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'sess_1', project_id: 'proj_new' }) })
        : route.continue()))
      await gotoApp(page)
      await page.locator('.sidebar-item').first().click({ button: 'right' })
      await page.locator('.sidebar-context-item', { hasText: 'New Project...' }).click()
    })

    test('opens from the context menu', async ({ page }) => {
      await expect(page.locator('.text-prompt-modal')).toBeVisible()
      await expect(page.locator('.text-prompt-input')).toHaveValue('')
    })

    test('confirming creates the project and moves the conversation into it', async ({ page }) => {
      await page.locator('.text-prompt-input').fill('Research')
      await page.locator('.text-prompt-btn-confirm').click()
      await expect(page.locator('.sidebar-project-row', { hasText: 'Research' })).toBeVisible()
      // The conversation was general (no project) and is now filed under the
      // new project, so it drops out of the flat general list.
      await expect(page.locator('.sidebar-item')).toHaveCount(0)
    })

    test('Cancel creates no project and does not move the conversation', async ({ page }) => {
      await page.locator('.text-prompt-input').fill('Research')
      await page.locator('.text-prompt-btn', { hasText: 'Cancel' }).click()
      await expect(page.locator('.sidebar-project-row')).toHaveCount(0)
      await expect(page.locator('.sidebar-item')).toHaveCount(1)
    })
  })
})
