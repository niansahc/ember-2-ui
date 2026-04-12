const { test, expect } = require('@playwright/test')
const path = require('path')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await mockBootstrap(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
  })

  test('file upload button is visible in chat input', async ({ page }) => {
    const attachBtn = page.locator('.input-attach')
    await expect(attachBtn).toBeVisible()
    await expect(attachBtn).toHaveAttribute('aria-label', 'Attach file')
  })

  test('hidden file input exists and accepts correct types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
    const accept = await fileInput.getAttribute('accept')
    expect(accept).toContain('.txt')
    expect(accept).toContain('.pdf')
    expect(accept).toContain('.jpg')
  })

  test('uploading a .txt file shows file chip preview', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const fixturePath = path.resolve(__dirname, 'fixtures', 'test.txt')

    await fileInput.setInputFiles(fixturePath)

    // File chip should appear with the filename
    const fileChip = page.locator('.input-file-chip')
    await expect(fileChip).toBeVisible()

    const fileName = page.locator('.input-file-name')
    await expect(fileName).toContainText('test.txt')
  })

  test('file chip has remove button', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const fixturePath = path.resolve(__dirname, 'fixtures', 'test.txt')

    await fileInput.setInputFiles(fixturePath)

    const removeBtn = page.locator('.input-file-remove')
    await expect(removeBtn).toBeVisible()

    // Click remove — chip should disappear
    await removeBtn.click()
    const fileChip = page.locator('.input-file-chip')
    await expect(fileChip).not.toBeVisible()
  })
})
