// Requires Ember API running at localhost:8000 (start_api.bat)

const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

// Read API key from .env file for direct API calls in tests
function readApiKey() {
  try {
    const envPath = path.resolve(__dirname, '../../.env')
    const content = fs.readFileSync(envPath, 'utf-8')
    const match = content.match(/^VITE_EMBER_API_KEY=(.+)$/m)
    return match ? match[1].trim() : ''
  } catch { return '' }
}

const API_URL = 'http://localhost:8000/v1'
const API_KEY = readApiKey()

function authHeaders() {
  return API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}
}

async function createTask(title) {
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title, status: 'active' }),
  })
  return await res.json()
}

async function cleanupTask(taskId) {
  try {
    await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status: 'cancelled' }),
    })
  } catch {}
}

test.describe('Task Tray', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('task tray is hidden when no active tasks exist', async ({ page }) => {
    const taskTray = page.locator('.sidebar-tasks')
    await expect(taskTray).not.toBeVisible()
  })

  test('task tray appears when a task is created via API', async ({ page }) => {
    // Create a task via the API
    const result = await createTask('Playwright test task')
    const taskId = result.id

    try {
      // Reload to trigger task fetch
      await page.reload()
      await page.waitForSelector('.app-layout', { timeout: 15000 })

      // Task tray should appear with the TASKS header and our task
      const taskTray = page.locator('.sidebar-tasks')
      await expect(taskTray).toBeVisible({ timeout: 10000 })

      const header = taskTray.locator('.sidebar-time-label')
      await expect(header).toContainText('TASKS')

      const taskTitle = taskTray.locator('.sidebar-task-title')
      await expect(taskTitle.first()).toContainText('Playwright test task')
    } finally {
      await cleanupTask(taskId)
    }
  })

  test('checking a task checkbox removes it from the tray', async ({ page }) => {
    // Create a task via the API
    const result = await createTask('Task to complete')
    const taskId = result.id

    try {
      await page.reload()
      await page.waitForSelector('.app-layout', { timeout: 15000 })

      // Wait for task tray to appear
      const taskTray = page.locator('.sidebar-tasks')
      await expect(taskTray).toBeVisible({ timeout: 10000 })

      // Find the checkbox and click it
      const checkbox = taskTray.locator('.sidebar-task-checkbox').first()
      await expect(checkbox).toBeVisible()
      await checkbox.click()

      // Task should disappear (optimistic removal)
      const taskTitle = taskTray.locator('.sidebar-task-title')
      await expect(taskTitle.filter({ hasText: 'Task to complete' })).not.toBeVisible({ timeout: 5000 })
    } finally {
      // Task was already marked done by the checkbox, but clean up just in case
      await cleanupTask(taskId)
    }
  })
})
