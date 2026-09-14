// Tests for split generation host support (ember-2 PR #170).
// GET /model can carry optional generation_available / generation_host keys
// when text generation is pointed at a separate host from the local Ollama
// instance. Vision must keep reading `available` (it runs local only);
// the text/generation model list must read generation_available when the
// key is present, falling back to `available` when it is not.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

test.describe('Split Model Host', () => {
  test('split absent: local tab lists available models, no host hint', async ({ page }) => {
    await mockBootstrap(page, {
      model: { available: ['qwen3:8b', 'llama3.2:3b'] },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const localTab = page.locator('.model-tab', { hasText: 'Local' })
    await localTab.click()

    await expect(page.locator('.model-list-item', { hasText: 'qwen3:8b' })).toBeVisible()
    await expect(page.locator('.generation-host-hint')).toHaveCount(0)
  })

  test('split present: local tab lists generation_available, not available', async ({ page }) => {
    await mockBootstrap(page, {
      model: {
        available: ['qwen3:8b'],
        generation_available: ['remote-llama3.1:70b'],
        generation_host: 'gpu-box.local',
      },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const localTab = page.locator('.model-tab', { hasText: 'Local' })
    await localTab.click()

    await expect(page.locator('.model-list-item', { hasText: 'remote-llama3.1:70b' })).toBeVisible()
    await expect(page.locator('.model-list-item', { hasText: 'qwen3:8b' })).toHaveCount(0)
  })

  test('split present: host hint is visible and names the host', async ({ page }) => {
    await mockBootstrap(page, {
      model: {
        available: ['qwen3:8b'],
        generation_available: ['remote-llama3.1:70b'],
        generation_host: 'gpu-box.local',
      },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const localTab = page.locator('.model-tab', { hasText: 'Local' })
    await localTab.click()

    await expect(page.locator('.generation-host-hint')).toContainText('gpu-box.local')
  })

  test('split present: vision selector still reads available, not generation_available', async ({ page }) => {
    await mockBootstrap(page, {
      model: {
        available: ['qwen3:8b', 'llava:13b'],
        generation_available: ['remote-llama3.1:70b'],
        generation_host: 'gpu-box.local',
      },
      preferences: { vision_enabled: true, vision_model: 'llava:13b' },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const featuresTab = page.locator('.settings-tab', { hasText: 'Features' })
    await featuresTab.click()

    const visionSelect = page.locator('select[aria-label="Vision model"]')
    await expect(visionSelect).toBeVisible()
    const optionValues = await visionSelect.locator('option').allTextContents()
    expect(optionValues).toContain('llava:13b')
    expect(optionValues).not.toContain('remote-llama3.1:70b')
  })

  test('split present with empty generation_available: local tab shows empty state, not available models', async ({ page }) => {
    await mockBootstrap(page, {
      model: {
        available: ['qwen3:8b'],
        generation_available: [],
        generation_host: 'gpu-box.local',
      },
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    const settingsBtn = page.locator('.app-header-btn[aria-label="Open settings"]')
    await settingsBtn.click()

    const localTab = page.locator('.model-tab', { hasText: 'Local' })
    await localTab.click()

    await expect(page.locator('.model-list-empty')).toBeVisible()
    await expect(page.locator('.model-list-item', { hasText: 'qwen3:8b' })).toHaveCount(0)
  })
})
