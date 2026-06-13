// Task tray — visibility and the done/undone toggle.
//
// Per ADR 0001 these run in the default lane against mocked task endpoints, so
// they're deterministic and need no live backend. This replaces the old
// createTask-via-API approach, which (a) read the API key out of .env, and
// (b) flaked in full-suite mode because other specs' chat traffic seeded tasks
// into the shared test vault between cleanup and assertion. The backend's
// task-creation round-trip is the backend repo's responsibility, not this one's.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const TASK = { id: 'task_tray01', title: 'Synthetic Task', status: 'active', metadata: {} }

// Let the task PATCH (done/undone toggle) succeed so the optimistic state
// sticks — otherwise handleTaskToggle would roll back and clear the done class.
async function mockTaskMutations(page) {
  await page.route(/\/tasks\/[^/?]+$/, async (route, request) => {
    if (request.method() === 'GET') return route.continue()
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

test.describe('Task Tray', () => {
  test('tray is hidden when no active tasks exist', async ({ page }) => {
    await mockBootstrap(page, { tasks: { active: [], proposed: [] } })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    await expect(page.locator('.sidebar-tasks')).not.toBeVisible()
  })

  test('tray shows active tasks', async ({ page }) => {
    await mockBootstrap(page, { tasks: { active: [TASK], proposed: [] } })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const taskTray = page.locator('.sidebar-tasks')
    await expect(taskTray).toBeVisible()
    await expect(taskTray.locator('.sidebar-time-label')).toContainText('TASKS')
    await expect(taskTray.locator('.sidebar-task-title').first()).toContainText('Synthetic Task')
  })

  test('checking a task shows strikethrough and stays visible', async ({ page }) => {
    await mockBootstrap(page, { tasks: { active: [TASK], proposed: [] } })
    await mockTaskMutations(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const taskTray = page.locator('.sidebar-tasks')
    await expect(taskTray).toBeVisible()

    const checkbox = taskTray.locator('.sidebar-task-checkbox').first()
    await checkbox.check()

    const taskRow = taskTray.locator('.sidebar-task-row').first()
    await expect(taskRow).toHaveClass(/sidebar-task-done/)
    const taskTitle = taskTray.locator('.sidebar-task-title').first()
    await expect(taskTitle).toBeVisible()
    await expect(taskTitle).toContainText('Synthetic Task')
  })

  test('unchecking a done task removes strikethrough', async ({ page }) => {
    await mockBootstrap(page, { tasks: { active: [TASK], proposed: [] } })
    await mockTaskMutations(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const taskTray = page.locator('.sidebar-tasks')
    await expect(taskTray).toBeVisible()

    const checkbox = taskTray.locator('.sidebar-task-checkbox').first()
    const taskRow = taskTray.locator('.sidebar-task-row').first()

    await checkbox.check()
    await expect(taskRow).toHaveClass(/sidebar-task-done/)

    await checkbox.uncheck()
    await expect(taskRow).not.toHaveClass(/sidebar-task-done/)
  })
})
