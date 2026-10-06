// Conversation loads issued while a reply is still streaming.
//
// 1. Switching to B mid-stream used to paint B immediately while A's stream
//    was still running, so B sat under A's typing indicator and Stop button,
//    and A's reply streamed into a message that was no longer on screen.
// 2. Clicking the conversation that is itself streaming reloaded it from the
//    backend. The backend writes turns only after it emits [DONE]
//    (ember-2 openai_adapter.py:2220/2252 vs :2222/2289), so the reload came
//    back without the in-flight exchange and the reply vanished from view.
//
// The chat endpoint is held open for STREAM_MS to keep the stream in flight.
// All content is synthetic (Vault Privacy Rule).

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const STREAM_MS = 1500
const now = new Date().toISOString()
const A = { id: 'sess_midstreama001', title: 'Synthetic conversation A', updated_at: now, project_id: null }
const B = { id: 'sess_midstreamb001', title: 'Synthetic conversation B', updated_at: now, project_id: null }

const STORED = {
  [A.id]: [{ id: 'a1', role: 'user', content: 'Synthetic stored A turn', timestamp: '2026-10-01T12-00-01-000001' }],
  [B.id]: [{ id: 'b1', role: 'user', content: 'Synthetic stored B turn', timestamp: '2026-10-01T12-00-01-000001' }],
}

async function setup(page) {
  await mockBootstrap(page, { conversations: [A, B] })
  await page.route(/\/conversations\/[^/?]+$/, async (route, request) => {
    if (request.method() !== 'GET') return route.continue()
    const id = request.url().split('/').pop()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // Stored turns only: the in-flight exchange is never in the response,
      // matching the backend's write-after-[DONE] ordering.
      body: JSON.stringify({ session: { id, title: 'Synthetic', created_at: now }, turns: STORED[id] || [] }),
    })
  })
  await page.route('**/v1/chat/completions', async (route) => {
    await new Promise((r) => setTimeout(r, STREAM_MS))
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body:
        `data: ${JSON.stringify({ choices: [{ delta: { content: 'Synthetic streamed reply' } }] })}\n` +
        `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n` +
        'data: [DONE]\n',
    })
  })
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
}

const row = (page, convo) => page.locator('.sidebar-item', { hasText: convo.title })
const bubble = (page, text) => page.locator('.bubble', { hasText: text })

async function openAndSend(page, convo) {
  await row(page, convo).click()
  await expect(bubble(page, 'Synthetic stored A turn')).toBeVisible({ timeout: 10000 })
  await page.locator('[aria-label="Message input"]').fill('Synthetic new question')
  await page.locator('[aria-label="Send message"]').click()
  await expect(page.locator('[aria-label="Stop generating"]')).toBeVisible()
}

test.describe('Conversation load during an in-flight stream', () => {
  test('switching to B mid-stream never shows B under A\'s live stream', async ({ page }) => {
    await setup(page)
    await openAndSend(page, A)

    await row(page, B).click()
    await expect(bubble(page, 'Synthetic stored B turn')).toBeVisible({ timeout: 10000 })
    // The moment B is on screen, nothing from A's stream may still be live.
    // Instant counts, not web-first assertions: those retry until the stream
    // ends on its own and would pass regardless (timeout: 0 means "no
    // timeout" in Playwright, not "check once").
    expect(await page.locator('[aria-label="Stop generating"]').count()).toBe(0)
    expect(await page.locator('.chat-typing').count()).toBe(0)
    // Control for the two zero counts above: the stream indicator is live
    // and countable on this page; openAndSend already saw Stop visible.
    await expect(bubble(page, 'Synthetic streamed reply')).toHaveCount(0)
  })

  test('clicking the conversation that is streaming keeps the in-flight reply', async ({ page }) => {
    await setup(page)
    await openAndSend(page, A)

    await row(page, A).click()
    await expect(page.locator('[aria-label="Send message"]')).toBeVisible({ timeout: 10000 })
    await expect(bubble(page, 'Synthetic new question')).toBeVisible()
    await expect(bubble(page, 'Synthetic streamed reply')).toBeVisible()
  })
})
