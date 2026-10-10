// Invalid conversation ids and citation URLs never become requests or links.
//
// Incident: a conversation list entry with a boolean id was clicked, the id
// was written to localStorage as "false", and the UI requested
// /v1/conversations/false. Separately, a web-search citation whose url was the
// bare string "false" rendered as <a href="false">, which opens the app's own
// origin at /false in a new tab (that is the address-bar symptom).
//
// Each absence assertion below ("no request", "no anchor", "key not written")
// is paired with a positive control that makes the thing happen with a valid
// value, so the absence test cannot pass on a fixture where the request could
// never have fired. All ids and urls are synthetic (Vault Privacy Rule).

const { test, expect } = require('@playwright/test')
const { mockBootstrap, mockConversationTurns } = require('./helpers/mock-bootstrap.cjs')

const now = new Date().toISOString()
const GOOD = { id: 'sess_validid0000001', title: 'Synthetic valid conversation', updated_at: now, project_id: null }
const BAD = { id: false, title: 'Synthetic boolean id conversation', updated_at: now, project_id: null }

const savedId = (page) => page.evaluate(() => localStorage.getItem('ember_active_session'))

// Record every request that targets a /conversations/{something} path.
function trackConversationRequests(page) {
  const seen = []
  page.on('request', (r) => {
    const m = r.url().match(/\/conversations\/([^/?]+)$/)
    if (m) seen.push(`${r.method()} ${m[1]}`)
  })
  return seen
}

const turn = (id, role, content) => ({ id, role, content, timestamp: '2026-10-01T12-00-01-000001' })

test.describe('Invalid conversation id in the sidebar list', () => {
  test('a list entry with a boolean id is not shown and issues no /conversations/false request', async ({ page }) => {
    await mockBootstrap(page, { conversations: [BAD, GOOD] })
    await mockConversationTurns(page, () => ({ turns: [turn('t1', 'user', 'Synthetic hello')] }))
    const seen = trackConversationRequests(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // The valid row is there; the broken one is not.
    await expect(page.locator('.sidebar-item', { hasText: GOOD.title })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.sidebar-item', { hasText: BAD.title })).toHaveCount(0)

    await page.locator('.sidebar-item', { hasText: GOOD.title }).click()
    await expect(page.locator('.bubble', { hasText: 'Synthetic hello' })).toBeVisible({ timeout: 10000 })

    expect(seen).not.toContain('GET false')
    // Positive control: the valid row did issue its request and was stored.
    expect(seen).toContain(`GET ${GOOD.id}`)
    expect(await savedId(page)).toBe(GOOD.id)
  })
})

test.describe('Stored "false" session id at boot', () => {
  async function boot(page, stored) {
    await mockBootstrap(page)
    await page.addInitScript((value) => {
      try { localStorage.setItem('ember_active_session', value) } catch {}
    }, stored)
    await mockConversationTurns(page, () => ({ turns: [turn('t1', 'user', 'Synthetic restored turn')] }))
    const seen = trackConversationRequests(page)
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    return seen
  }

  test('a stored "false" is cleared with no request and no error turn', async ({ page }) => {
    const seen = await boot(page, 'false')

    await expect(page.locator('.chat-empty')).toBeVisible({ timeout: 10000 })
    await expect.poll(() => savedId(page)).toBeNull()
    await expect(page.locator('[data-testid="chat-error"]')).toHaveCount(0)
    expect(seen).not.toContain('GET false')
  })

  test('positive control: a stored valid id is still requested and kept', async ({ page }) => {
    const seen = await boot(page, GOOD.id)

    await expect(page.locator('.bubble', { hasText: 'Synthetic restored turn' })).toBeVisible({ timeout: 10000 })
    expect(seen).toContain(`GET ${GOOD.id}`)
    expect(await savedId(page)).toBe(GOOD.id)
  })
})

test.describe('Copy for a conversation the backend cannot find', () => {
  async function openWithStatus(page, status) {
    await mockBootstrap(page, { conversations: [GOOD] })
    await mockConversationTurns(page, () => ({ status }))
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    await page.locator('.sidebar-item', { hasText: GOOD.title }).click()
    const err = page.locator('[data-testid="chat-error"]')
    await expect(err).toBeVisible({ timeout: 10000 })
    return err
  }

  test('a 404 on a sidebar click says the conversation was not found, not that the backend is down', async ({ page }) => {
    const err = await openWithStatus(page, 404)
    await expect(err).toContainText("I couldn't find that conversation. It may have been deleted.")
    await expect(err).not.toContainText('backend may not be running')
  })

  test('positive control: a 500 still shows the backend-may-be-down copy', async ({ page }) => {
    const err = await openWithStatus(page, 500)
    await expect(err).toContainText('backend may not be running')
    await expect(err).not.toContainText("couldn't find that conversation")
  })
})

test.describe('Web-search citation links', () => {
  async function sendWithSources(page, sources) {
    await mockBootstrap(page)
    await page.route('**/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body:
          `data: ${JSON.stringify({ type: 'sources', sources })}\n` +
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'Synthetic reply with sources' } }] })}\n` +
          `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n` +
          'data: [DONE]\n',
      })
    })
    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    await page.locator('[aria-label="Message input"]').fill('Synthetic question')
    await page.locator('[aria-label="Send message"]').click()
    await expect(page.locator('.bubble', { hasText: 'Synthetic reply with sources' })).toBeVisible({ timeout: 10000 })
    return page.locator('.bubble-sources')
  }

  test('a source whose url is "false" renders its title as text with no anchor', async ({ page }) => {
    const block = await sendWithSources(page, [{ title: 'Synthetic broken source', url: 'false' }])

    await expect(block).toContainText('Synthetic broken source')
    await expect(block.locator('a')).toHaveCount(0)
  })

  test('positive control: an https url renders an anchor that opens in a new tab', async ({ page }) => {
    const block = await sendWithSources(page, [{ title: 'Synthetic good source', url: 'https://example.test/a' }])

    const link = block.locator('a.bubble-source-link')
    await expect(link).toHaveCount(1)
    await expect(link).toHaveAttribute('href', 'https://example.test/a')
    await expect(link).toHaveAttribute('target', '_blank')
  })
})
