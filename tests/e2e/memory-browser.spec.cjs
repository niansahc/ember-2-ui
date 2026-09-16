// Tests for the Memory Browser (Settings > Memory tab > Browse Vault).
// Read-only vault inspection surface backed by read-memories, search-memories,
// semantic-search, and debug-context. All fixture data below is synthetic —
// Vault Privacy Rule: no real vault content in tests.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

async function mockMemoryTabDeps(page) {
  await page.route('**/v1/vault/storage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ current_bytes: 1024, projection_30d_bytes: 2048 }),
    })
  })
  await page.route('**/v1/lodestone', async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ records: [] }),
    })
  })
  await page.route('**/v1/developer/status', async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ dev_mode: false }),
    })
  })
}

async function openMemoryTab(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  await page.locator('.app-header-btn[aria-label="Open settings"]').click()
  await page.locator('.settings-tab', { hasText: 'Memory' }).click()
}

test.describe('Memory Browser', () => {
  test('shows per-type counts on Browse, capped at 500+', async ({ page }) => {
    await mockBootstrap(page)
    await mockMemoryTabDeps(page)

    await page.route('**/read-memories**', async (route, request) => {
      const url = new URL(request.url())
      const type = url.searchParams.get('memory_type')
      if (type === 'journal') {
        const memories = Array.from({ length: 3 }, (_, i) => ({
          id: `journal-${i}`,
          timestamp: '2026-01-01T00-00-00',
          type: 'journal',
          text: `synthetic journal entry ${i}`,
          source: 'ui',
          metadata: {},
        }))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memories }) })
      }
      if (type === 'ingested') {
        const memories = Array.from({ length: 500 }, (_, i) => ({
          id: `ing-${i}`,
          timestamp: '2026-01-01T00-00-00',
          type: 'ingested',
          text: 'synthetic ingested chunk',
          source: 'ingest',
          metadata: {},
        }))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memories }) })
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memories: [] }) })
    })

    await openMemoryTab(page)
    await page.locator('[data-testid="memory-browser-expand"]').click()

    await expect(page.locator('[data-testid="memory-type-chip-journal"]')).toContainText('3')
    await expect(page.locator('[data-testid="memory-type-chip-ingested"]')).toContainText('500+')
    await expect(page.locator('[data-testid="memory-type-chip-task"]')).toContainText('0')
  })

  test('selecting a type renders its records without tier/authorship fields', async ({ page }) => {
    await mockBootstrap(page)
    await mockMemoryTabDeps(page)

    await page.route('**/read-memories**', async (route, request) => {
      const url = new URL(request.url())
      const type = url.searchParams.get('memory_type')
      if (type === 'journal') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            memories: [{
              id: 'journal-1',
              timestamp: '2026-01-01T00-00-00',
              type: 'journal',
              text: 'synthetic journal entry about a walk',
              source: 'ui',
              metadata: { source_record_ids: ['a', 'b'] },
            }],
          }),
        })
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memories: [] }) })
    })

    await openMemoryTab(page)
    await page.locator('[data-testid="memory-browser-expand"]').click()
    await page.locator('[data-testid="memory-type-chip-journal"]').click()

    await expect(page.locator('.memory-browser-text', { hasText: 'synthetic journal entry about a walk' })).toBeVisible()
    await expect(page.locator('.memory-browser-provenance', { hasText: 'Derived from 2 sources' })).toBeVisible()
    await expect(page.locator('.memory-browser-badge')).toHaveCount(0)
  })

  test('ingested type shows the JSON-only count caveat', async ({ page }) => {
    await mockBootstrap(page)
    await mockMemoryTabDeps(page)
    await page.route('**/read-memories**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memories: [] }) })
    })

    await openMemoryTab(page)
    await page.locator('[data-testid="memory-browser-expand"]').click()
    await page.locator('[data-testid="memory-type-chip-ingested"]').click()

    await expect(page.locator('.memory-browser-note', { hasText: 'JSON records only' })).toBeVisible()
  })

  test('keyword search renders results for the selected type', async ({ page }) => {
    await mockBootstrap(page)
    await mockMemoryTabDeps(page)
    await page.route('**/read-memories**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memories: [] }) })
    })
    await page.route('**/search-memories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{
            id: 'conv-1',
            timestamp: '2026-02-01T00-00-00',
            type: 'conversation',
            text: 'synthetic conversation turn about hiking',
            source: 'chat',
            metadata: {},
          }],
        }),
      })
    })

    await openMemoryTab(page)
    await page.locator('[data-testid="memory-browser-expand"]').click()
    await page.locator('.settings-segmented-btn', { hasText: 'Search' }).click()
    await page.locator('.memory-browser-search-input').fill('hiking')
    await page.locator('.memory-browser-search-form button[type="submit"]').click()

    await expect(page.locator('.memory-browser-text', { hasText: 'synthetic conversation turn about hiking' })).toBeVisible()
  })

  test('semantic search renders tier and authorship when present', async ({ page }) => {
    await mockBootstrap(page)
    await mockMemoryTabDeps(page)
    await page.route('**/read-memories**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memories: [] }) })
    })
    await page.route('**/semantic-search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{
            id: 'ref-1',
            content: 'synthetic reflection about a recurring theme',
            score: 0.812345,
            memory_type: 'reflection',
            tier: 'warm',
            authorship: 'first_person',
            created_at: '2026-03-01T00-00-00',
            metadata: {},
          }],
        }),
      })
    })

    await openMemoryTab(page)
    await page.locator('[data-testid="memory-browser-expand"]').click()
    await page.locator('.settings-segmented-btn', { hasText: 'Search' }).click()
    await page.locator('.settings-segmented-btn', { hasText: 'Semantic' }).click()
    await page.locator('.memory-browser-search-input').fill('recurring theme')
    await page.locator('.memory-browser-search-form button[type="submit"]').click()

    await expect(page.locator('.memory-browser-badge-warm', { hasText: 'warm' })).toBeVisible()
    await expect(page.locator('.memory-browser-badge', { hasText: 'first_person' })).toBeVisible()
    await expect(page.locator('.memory-browser-score', { hasText: '0.812' })).toBeVisible()
  })

  test('preview renders ranked items and the pipeline disclaimer', async ({ page }) => {
    await mockBootstrap(page)
    await mockMemoryTabDeps(page)
    await page.route('**/read-memories**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memories: [] }) })
    })
    await page.route('**/debug-context**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          memory_items: [{
            id: 'mem-1',
            content: 'synthetic profile fact',
            item_type: 'memory',
            memory_type: 'profile',
            score: 0.95,
            tier: 'hot',
            authorship: 'first_person',
            metadata: {},
          }],
          reflection_items: [],
          state_items: [],
          task_items: [],
        }),
      })
    })

    await openMemoryTab(page)
    await page.locator('[data-testid="memory-browser-expand"]').click()
    await page.locator('.settings-segmented-btn', { hasText: 'Preview' }).click()

    await expect(page.locator('.memory-browser-note', { hasText: 'trigger a web search' })).toBeVisible()

    await page.locator('.memory-browser-search-input').fill('what do you know about me?')
    await page.locator('.memory-browser-search-form button[type="submit"]').click()

    await expect(page.locator('.memory-browser-text', { hasText: 'synthetic profile fact' })).toBeVisible()
    await expect(page.locator('.memory-browser-badge-hot')).toBeVisible()
  })

  test('a failed search shows a local error state, not a crash', async ({ page }) => {
    await mockBootstrap(page)
    await mockMemoryTabDeps(page)
    await page.route('**/read-memories**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memories: [] }) })
    })
    await page.route('**/search-memories**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) })
    })

    await openMemoryTab(page)
    await page.locator('[data-testid="memory-browser-expand"]').click()
    await page.locator('.settings-segmented-btn', { hasText: 'Search' }).click()
    await page.locator('.memory-browser-search-input').fill('anything')
    await page.locator('.memory-browser-search-form button[type="submit"]').click()

    await expect(page.locator('.lodestone-empty', { hasText: 'Search failed' })).toBeVisible()
  })
})
