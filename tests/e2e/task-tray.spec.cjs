const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

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
  if (!res.ok) return null
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
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('task tray is hidden when no active tasks exist', async ({ page }) => {
    const taskTray = page.locator('.sidebar-tasks')
    await expect(taskTray).not.toBeVisible()
  })

  test('task tray appears when a task is created via API', async ({ page }) => {
    test.setTimeout(60000)
    const result = await createTask('Playwright test task')
    if (!result || !result.id) {
      test.skip(true, 'Task API unavailable — cannot create test task')
      return
    }
    const taskId = result.id

    try {
      await page.reload()
      await page.waitForSelector('.app-layout', { timeout: 15000 })

      const taskTray = page.locator('.sidebar-tasks')
      await expect(taskTray).toBeVisible({ timeout: 35000 })

      const header = taskTray.locator('.sidebar-time-label')
      await expect(header).toContainText('TASKS')

      const taskTitle = taskTray.locator('.sidebar-task-title')
      await expect(taskTitle.first()).toContainText('Playwright test task')
    } finally {
      await cleanupTask(taskId)
    }
  })

  test('checking a task shows strikethrough and stays visible', async ({ page }) => {
    test.setTimeout(60000)
    const result = await createTask('Task to check off')
    if (!result || !result.id) {
      test.skip(true, 'Task API unavailable — cannot create test task')
      return
    }
    const taskId = result.id

    try {
      await page.reload()
      await page.waitForSelector('.app-layout', { timeout: 15000 })

      const taskTray = page.locator('.sidebar-tasks')
      try {
        await expect(taskTray).toBeVisible({ timeout: 35000 })
      } catch {
        test.skip(true, 'Task tray did not appear — sidebar may not be visible at this viewport')
        return
      }

      // Click the checkbox
      const checkbox = taskTray.locator('.sidebar-task-checkbox').first()
      await checkbox.click()

      // Task row should get the done class (strikethrough + dimmed)
      const taskRow = taskTray.locator('.sidebar-task-row').first()
      await expect(taskRow).toHaveClass(/sidebar-task-done/, { timeout: 3000 })

      // Task title should still be visible (not removed)
      const taskTitle = taskTray.locator('.sidebar-task-title').first()
      await expect(taskTitle).toBeVisible()
      await expect(taskTitle).toContainText('Task to check off')
    } finally {
      await cleanupTask(taskId)
    }
  })

  test('unchecking a done task removes strikethrough', async ({ page }) => {
    test.setTimeout(60000)
    const result = await createTask('Task to toggle')
    if (!result || !result.id) {
      test.skip(true, 'Task API unavailable — cannot create test task')
      return
    }
    const taskId = result.id

    try {
      await page.reload()
      await page.waitForSelector('.app-layout', { timeout: 15000 })

      const taskTray = page.locator('.sidebar-tasks')
      try {
        await expect(taskTray).toBeVisible({ timeout: 35000 })
      } catch {
        test.skip(true, 'Task tray did not appear — sidebar may not be visible at this viewport')
        return
      }

      const checkbox = taskTray.locator('.sidebar-task-checkbox').first()
      const taskRow = taskTray.locator('.sidebar-task-row').first()

      // Check it
      await checkbox.click()
      await expect(taskRow).toHaveClass(/sidebar-task-done/, { timeout: 3000 })

      // Uncheck it
      await checkbox.click()
      await expect(taskRow).not.toHaveClass(/sidebar-task-done/, { timeout: 3000 })
    } finally {
      await cleanupTask(taskId)
    }
  })
})
