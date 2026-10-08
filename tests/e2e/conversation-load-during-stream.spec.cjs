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
const { mockBootstrap, mockConversationTurns, gate } = require('./helpers/mock-bootstrap.cjs')

const now = new Date().toISOString()
const A = { id: 'sess_midstreama001', title: 'Synthetic conversation A', updated_at: now, project_id: null }
const B = { id: 'sess_midstreamb001', title: 'Synthetic conversation B', updated_at: now, project_id: null }

// Stored turns only: the in-flight exchange is never in the response,
// matching the backend's write-after-[DONE] ordering.
const STORED = {
  [A.id]: [{ id: 'a1', role: 'user', content: 'Synthetic stored A turn', timestamp: '2026-10-01T12-00-01-000001' }],
  [B.id]: [{ id: 'b1', role: 'user', content: 'Synthetic stored B turn', timestamp: '2026-10-01T12-00-01-000001' }],
}

// The chat route is held on a gate, so the stream stays in flight until the
// test releases it. No fixed delay.
async function setup(page) {
  const streamGate = gate()
  await mockBootstrap(page, { conversations: [A, B] })
  await mockConversationTurns(page, (id) => ({ turns: STORED[id] || [] }))
  await page.route('**/v1/chat/completions', async (route) => {
    await streamGate.promise
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
  return streamGate
}

const row = (page, convo) => page.locator('.sidebar-item', { hasText: convo.title })
const bubble = (page, text) => page.locator('.bubble', { hasText: text })
const turnsResponse = (page, convo, opts) => page.waitForResponse((r) => r.url().endsWith(convo.id), opts)
const flushFrames = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

// Open A, send, and leave the reply in flight (held on the stream gate).
async function openAAndSend(page) {
  await row(page, A).click()
  await expect(bubble(page, 'Synthetic stored A turn')).toBeVisible({ timeout: 10000 })
  await page.locator('[aria-label="Message input"]').fill('Synthetic new question')
  await page.locator('[aria-label="Send message"]').click()
  await expect(page.locator('[aria-label="Stop generating"]')).toBeVisible()
}

test.describe('Conversation load during an in-flight stream', () => {
  test('switching to B mid-stream waits for A\'s stream before painting B', async ({ page }) => {
    const streamGate = await setup(page)
    await openAAndSend(page)

    // B's turns are fetched while A is still streaming...
    const bLoaded = turnsResponse(page, B)
    await row(page, B).click()
    await (await bLoaded).finished()
    await flushFrames(page)
    // ...but not painted under A's live stream. Stop is still visible here,
    // which is the positive control: the stream really is in flight.
    await expect(page.locator('[aria-label="Stop generating"]')).toBeVisible()
    await expect(bubble(page, 'Synthetic stored B turn')).toHaveCount(0)

    streamGate.release()
    await expect(bubble(page, 'Synthetic stored B turn')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[aria-label="Send message"]')).toBeVisible()
    await expect(page.locator('.chat-typing')).toHaveCount(0)
    await expect(bubble(page, 'Synthetic streamed reply')).toHaveCount(0)
  })

  test('clicking the conversation that is streaming keeps the in-flight reply', async ({ page }) => {
    const streamGate = await setup(page)
    await openAAndSend(page)

    // A correct UI issues no reload here, so there may be no response to wait
    // for. Give a buggy reload a bounded window to land before the stream is
    // released; a fixed build just spends the 500ms.
    const reload = turnsResponse(page, A, { timeout: 500 })
    await row(page, A).click()
    await reload.then((r) => r.finished(), () => {})
    streamGate.release()

    await expect(page.locator('[aria-label="Send message"]')).toBeVisible({ timeout: 10000 })
    await expect(bubble(page, 'Synthetic new question')).toBeVisible()
    await expect(bubble(page, 'Synthetic streamed reply')).toBeVisible()
  })
})
