const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

// H1 — silent-failure remediation.
//
// Every optimistic mutation in the sidebar (rename / delete / move a
// conversation, toggle a task) must roll its state back AND surface an inline
// error when the backend write fails. These specs force the failure with
// page.route(...).abort() and assert both halves: the optimistic change is
// undone, and the row briefly carries a "couldn't ..." message.
//
// Fully self-contained: the conversation / project / task lists are mocked so
// the test never depends on a live backend or real vault data (Vault Privacy
// Rule — synthetic fixtures only).

const CONVO = {
  id: 'sess_rollbacktest01',
  title: 'Synthetic Conversation',
  // Rendered through the time-bucket grouping, so it needs a parseable
  // recent timestamp to show up in the "Today" bucket.
  updated_at: new Date().toISOString(),
  project_id: null,
}

const PROJECT = {
  id: 'proj_rollbacktest01',
  name: 'Synthetic Project',
  color: '#ff8c00',
  conversation_count: 0,
}

const TASK = {
  id: 'task_rollbacktest01',
  title: 'Synthetic Task',
  status: 'active',
  metadata: {},
}

// Seed the list endpoints with deterministic synthetic data, then hand back to
// the per-test routes for the mutation under test.
async function seedLists(page) {
  // GET /v1/conversations?limit=... — the list (has a query string)
  await page.route(/\/conversations\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ conversations: [CONVO] }),
    })
  })
  // GET /v1/projects
  await page.route(/\/projects$/, async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [PROJECT] }),
    })
  })
  // GET /v1/tasks?status=...
  await page.route(/\/tasks\?/, async (route) => {
    const status = new URL(route.request().url()).searchParams.get('status')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tasks: status === 'active' ? [TASK] : [] }),
    })
  })
}

test.describe('Optimistic mutation rollback (H1)', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
    await seedLists(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    // Confirm the synthetic conversation rendered before any test interacts.
    await expect(page.locator('.sidebar-item')).toHaveCount(1)
  })

  test('failed delete restores the conversation and shows an error', async ({ page }) => {
    // DELETE /v1/conversations/{id} never lands.
    await page.route(/\/conversations\/[^/?]+$/, (route) => route.abort())

    await page.locator('.sidebar-item').first().click({ button: 'right' })
    await page.locator('.sidebar-context-item', { hasText: 'Delete' }).click()

    // Rollback: the row comes back (error text only appears in the catch, so
    // its presence proves the optimistic removal was undone).
    const errored = page.locator('.sidebar-item-error .sidebar-item-title')
    await expect(errored).toBeVisible()
    await expect(errored).toContainText("Couldn't delete")
    await expect(page.locator('.sidebar-item')).toHaveCount(1)
  })

  test('failed rename reverts the title and shows an error', async ({ page }) => {
    await page.route(/\/conversations\/[^/?]+$/, (route) => route.abort())
    // handleRename uses window.prompt — supply a new title.
    page.on('dialog', (dialog) => dialog.accept('Renamed Title'))

    await page.locator('.sidebar-item').first().click({ button: 'right' })
    await page.locator('.sidebar-context-item', { hasText: 'Rename' }).click()

    const errored = page.locator('.sidebar-item-error .sidebar-item-title')
    await expect(errored).toBeVisible()
    await expect(errored).toContainText("Couldn't rename")
    // Title reverted: the optimistic "Renamed Title" is gone (it shows the
    // error now, and after auto-clear returns to the original).
    await expect(page.locator('.sidebar-item-title')).not.toContainText('Renamed Title')
  })

  test('failed move keeps the conversation and shows an error', async ({ page }) => {
    await page.route(/\/conversations\/[^/?]+$/, (route) => route.abort())

    await page.locator('.sidebar-item').first().click({ button: 'right' })
    // Move into the synthetic project from the context menu.
    await page.locator('.sidebar-context-item', { hasText: 'Synthetic Project' }).click()

    const errored = page.locator('.sidebar-item-error .sidebar-item-title')
    await expect(errored).toBeVisible()
    await expect(errored).toContainText("Couldn't move")
    await expect(page.locator('.sidebar-item')).toHaveCount(1)
  })

  test('failed task toggle unchecks the box and shows an error', async ({ page }) => {
    // PATCH /v1/tasks/{id} never lands.
    await page.route(/\/tasks\/[^/?]+$/, (route) => route.abort())

    const checkbox = page.locator('.sidebar-task-checkbox').first()
    await expect(checkbox).not.toBeChecked()
    await checkbox.check()

    // Rollback: checkbox snaps back to unchecked, and the task title slot
    // carries the error.
    await expect(checkbox).not.toBeChecked()
    await expect(page.locator('.sidebar-task-error .sidebar-task-title')).toContainText("Couldn't update")
  })
})
