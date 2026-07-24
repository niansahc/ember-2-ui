// End-to-end user journeys — default lane (mocked, no live backend, ADR 0001).
//
// Each test is a whole flow a real user would run, composed from the app's
// real code paths and driven with the established mock patterns:
//   - mockBootstrap() for the splash->chat handshake + list GETs
//   - page.route('**/v1/chat/completions') fulfilling a synthetic SSE body,
//     which keeps useChat on the REAL streaming branch (a non-200/abort would
//     trip the mock fallback instead)
//   - per-mutation page.route for POST/PATCH/DELETE (mockBootstrap only mocks
//     the GET lists; writes fall through by design)
//
// Synthetic fixtures only (Vault Privacy Rule). Backend-dependent flows that
// cannot be driven deterministically stay in @needs-live-backend; everything
// here is deterministic and runs on every PR.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const now = () => new Date().toISOString()

const CONVO = { id: 'sess_journey01', title: 'Synthetic Conversation', updated_at: now(), project_id: null }
const TURNS = [
  { id: 't1', role: 'user', content: 'Hello there', timestamp: now() },
  { id: 't2', role: 'assistant', content: 'General Kenobi', timestamp: now() },
]

async function gotoApp(page) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
}

/** Register the chat SSE route with a given body and optional pre-hold + headers. */
async function sseRoute(page, body, { holdMs = 0, headers = {} } = {}) {
  await page.route('**/v1/chat/completions', async (route) => {
    if (holdMs) await new Promise((r) => setTimeout(r, holdMs))
    await route.fulfill({ status: 200, contentType: 'text/event-stream', headers, body })
  })
}

const send = async (page, text) => {
  await page.locator('[aria-label="Message input"]').fill(text)
  await page.locator('[aria-label="Send message"]').click()
}
const emberText = (page) => page.locator('.bubble-ember .bubble-markdown').last()

// ─────────────────────────────────────────────────────────────────────────

test.describe('User journeys', () => {
  test('new user completes onboarding and sends a first message', async ({ page }) => {
    await mockBootstrap(page, { preferences: { onboarding_complete: false } })
    // Onboarding completion + the memory tab that auto-opens both soft-fail,
    // but stub them so nothing hits the network and the tab stays quiet.
    await page.route('**/write-state', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }))
    await page.route(/\/lodestone/, (r) => (r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: '{"records":[]}' })
      : r.continue()))
    await page.route(/\/vault\/storage/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    await sseRoute(page, 'data: {"choices":[{"delta":{"content":"Welcome aboard."}}]}\n\ndata: [DONE]\n')

    await page.goto('/')
    await page.waitForSelector('.onboarding', { timeout: 15000 })
    await page.locator('.onboarding-btn-skip', { hasText: 'Skip all' }).click()
    await page.locator('.onboarding-btn-skip', { hasText: 'Skip for now' }).click()

    // Completion lands in the app with Settings open on the memory tab — close it.
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    await page.locator('[aria-label="Close settings"], .settings-close-btn').first().click()

    await send(page, 'Hello Ember')
    await expect(emberText(page)).toContainText('Welcome aboard.', { timeout: 10000 })
  })

  test('returning user sees history and opens a conversation', async ({ page }) => {
    await mockBootstrap(page, { conversations: [CONVO] })
    await page.route(/\/conversations\/[^/?]+$/, (route, req) => (req.method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ turns: TURNS }) })
      : route.continue()))
    await gotoApp(page)

    const item = page.locator('.sidebar-item').first()
    await expect(item).toBeVisible()
    await item.click()
    await expect(page.locator('.bubble', { hasText: 'General Kenobi' })).toBeVisible({ timeout: 10000 })
  })

  test('user asks a question and sees a streamed response', async ({ page }) => {
    await mockBootstrap(page)
    await sseRoute(
      page,
      'data: {"choices":[{"delta":{"content":"Here is "}}]}\n\ndata: {"choices":[{"delta":{"content":"the answer."}}]}\n\ndata: [DONE]\n',
      { holdMs: 400 },
    )
    await gotoApp(page)
    await send(page, 'What is 2 + 2?')
    await expect(page.locator('.chat-typing')).toBeVisible()
    await expect(emberText(page)).toContainText('Here is the answer.', { timeout: 10000 })
  })

  test('follow-up message carries prior context to the backend', async ({ page }) => {
    await mockBootstrap(page)
    const bodies = []
    await page.route('**/v1/chat/completions', async (route) => {
      bodies.push(route.request().postData())
      const n = bodies.length
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: {"choices":[{"delta":{"content":"Reply ${n}."}}]}\n\ndata: [DONE]\n`,
      })
    })
    await gotoApp(page)

    await send(page, 'My name is Sam')
    await expect(emberText(page)).toContainText('Reply 1.', { timeout: 10000 })
    await send(page, 'What is my name?')
    await expect(emberText(page)).toContainText('Reply 2.', { timeout: 10000 })

    expect(bodies).toHaveLength(2)
    // The second request rebuilds the full history, so it must include exchange 1.
    expect(bodies[1]).toContain('My name is Sam')
    await expect(page.locator('.bubble-ember')).toHaveCount(2)
  })

  test('user creates a project and moves a conversation into it', async ({ page }) => {
    await mockBootstrap(page, {
      conversations: [{ id: 'sess_1', title: 'My Chat', updated_at: now(), project_id: null }],
      projects: [],
    })
    await page.route(/\/projects$/, (route, req) => (req.method() === 'POST'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'proj_new', name: 'Work', color: '#ff8c00' }) })
      : route.continue()))
    await page.route(/\/conversations\/[^/?]+$/, (route, req) => (req.method() === 'PATCH'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'sess_1', project_id: 'proj_new' }) })
      : route.continue()))
    page.on('dialog', (d) => d.accept('Work'))
    await gotoApp(page)

    await page.locator('.sidebar-section-add[aria-label="New project"]').click()
    await expect(page.locator('.sidebar-project-row', { hasText: 'Work' })).toBeVisible()

    await page.locator('.sidebar-item').first().click({ button: 'right' })
    await page.locator('.sidebar-context-item', { hasText: 'Work' }).click()
    await expect(page.locator('.sidebar-item')).toHaveCount(0)
  })

  test('user renames a conversation and it persists across reload', async ({ page }) => {
    const ts = now()
    let title = 'Old Title'
    await mockBootstrap(page)
    // Stateful conversation list — reflects the rename so a reload keeps it.
    await page.route(/\/conversations(\?|$)/, (route, req) => (req.method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [{ id: 'sess_1', title, updated_at: ts, project_id: null }] }) })
      : route.continue()))
    await page.route(/\/conversations\/[^/?]+$/, (route, req) => {
      if (req.method() !== 'PATCH') return route.continue()
      try { const b = JSON.parse(req.postData() || '{}'); if (b.title) title = b.title } catch { /* ignore */ }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'sess_1', title }) })
    })
    page.on('dialog', (d) => d.accept('New Title'))
    await gotoApp(page)

    await page.locator('.sidebar-item').first().click({ button: 'right' })
    await page.locator('.sidebar-context-item', { hasText: 'Rename' }).click()
    await expect(page.locator('.sidebar-item-title')).toContainText('New Title')

    await page.reload()
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    await expect(page.locator('.sidebar-item-title')).toContainText('New Title')
  })

  test('user deletes a conversation and it disappears', async ({ page }) => {
    await mockBootstrap(page, { conversations: [{ id: 'sess_1', title: 'Doomed', updated_at: now(), project_id: null }] })
    await page.route(/\/conversations\/[^/?]+$/, (route, req) => (req.method() === 'DELETE'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      : route.continue()))
    await gotoApp(page)

    await expect(page.locator('.sidebar-item')).toHaveCount(1)
    await page.locator('.sidebar-item').first().click({ button: 'right' })
    await page.locator('.sidebar-context-item', { hasText: 'Delete' }).click()
    await expect(page.locator('.sidebar-item')).toHaveCount(0)
  })

  test('user changes appearance in Settings and it applies', async ({ page }) => {
    await mockBootstrap(page)
    await gotoApp(page)

    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 5000 })
    await page.locator('.settings-tab', { hasText: 'Appearance' }).click()
    await page.locator('.style-pack-card', { hasText: 'Cool Hacker' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-style-pack', 'hacker')
  })

  test('user sets up a PIN from Settings and completes it', async ({ page }) => {
    await mockBootstrap(page) // pin_set:false -> "Set up PIN" shows
    await page.route('**/security/pin/set', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'set' }) }))
    await gotoApp(page)

    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    await page.locator('.settings-tab', { hasText: 'Security' }).click()
    await page.locator('.settings-action-btn', { hasText: 'Set up PIN' }).click()
    await expect(page.locator('.pin-setup-overlay')).toBeVisible()

    await page.locator('.pin-setup-overlay .pin-setup-btn-primary').click() // intro -> form
    await page.locator('#pin-setup-pin').fill('1234')
    await page.locator('#pin-setup-pin-confirm').fill('1234')
    await page.locator('#pin-setup-passphrase').fill('correct horse battery staple ok')
    await page.locator('#pin-setup-passphrase-confirm').fill('correct horse battery staple ok')
    await page.locator('button[type="submit"].pin-setup-btn-primary').click()

    await expect(page.locator('.pin-setup-title', { hasText: "You're all set." })).toBeVisible({ timeout: 10000 })
  })

  test('user asks for a web search and can click a source citation', async ({ page }) => {
    await mockBootstrap(page)
    await sseRoute(
      page,
      'data: {"sources":[{"url":"https://example.com/a","title":"Example A"}]}\n\ndata: {"choices":[{"delta":{"content":"Here is what I found."}}]}\n\ndata: [DONE]\n',
      { headers: { 'x-ember-web-search': 'true' } },
    )
    await gotoApp(page)
    await send(page, 'search the web for X')
    await expect(emberText(page)).toContainText('Here is what I found.', { timeout: 10000 })

    const link = page.locator('.bubble-source-link', { hasText: 'Example A' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', 'https://example.com/a')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('status events flow through the stream and the typing indicator shows', async ({ page }) => {
    await mockBootstrap(page)
    // The SSE carries typed status frames (searching -> verifying) ahead of the
    // content, exercising the status-frame parse path in ember.js/useChat. The
    // pre-hold keeps the typing indicator observably visible while isStreaming.
    //
    // NOTE: the status LABEL text (.chat-status-label) is deliberately NOT
    // asserted. With an atomic mock SSE the status is set and then cleared by
    // the very next content frame with no paint in between, so the label is not
    // deterministically observable — asserting it would be flaky (forbidden by
    // the no-flaky rule). We assert the observable surface: the pipeline handles
    // status frames without breaking and the final content renders.
    await sseRoute(
      page,
      'data: {"type":"status","content":"searching"}\n\ndata: {"type":"status","content":"verifying"}\n\ndata: {"choices":[{"delta":{"content":"Done."}}]}\n\ndata: [DONE]\n',
      { holdMs: 600 },
    )
    await gotoApp(page)
    await send(page, 'research this thoroughly')
    await expect(page.locator('.chat-typing')).toBeVisible({ timeout: 10000 })
    await expect(emberText(page)).toContainText('Done.', { timeout: 10000 })
  })

  test('a failed conversation delete rolls back and surfaces an inline error', async ({ page }) => {
    await mockBootstrap(page, { conversations: [{ id: 'sess_1', title: 'Keeper', updated_at: now(), project_id: null }] })
    await page.route(/\/conversations\/[^/?]+$/, (route) => route.abort())
    await gotoApp(page)

    await page.locator('.sidebar-item').first().click({ button: 'right' })
    await page.locator('.sidebar-context-item', { hasText: 'Delete' }).click()

    const errored = page.locator('.sidebar-item-error .sidebar-item-title')
    await expect(errored).toBeVisible()
    await expect(errored).toContainText("Couldn't delete")
    await expect(page.locator('.sidebar-item')).toHaveCount(1) // restored — app stays usable
  })

  test('a failed chat request does not hang the UI', async ({ page }) => {
    await mockBootstrap(page)
    await page.route('**/v1/chat/completions', (route) => route.abort())
    await gotoApp(page)

    await send(page, 'hello')
    // Real stream fails -> mock fallback yields a response -> stream ends.
    await expect(emberText(page)).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[aria-label="Send message"]')).toBeVisible() // back to idle, not stuck on Stop
    await expect(page.locator('.chat-typing')).toBeHidden()
  })

  test('active conversation is restored after a reload', async ({ page }) => {
    await mockBootstrap(page, { conversations: [CONVO] })
    await page.route(/\/conversations\/[^/?]+$/, (route, req) => (req.method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ turns: TURNS }) })
      : route.continue()))
    await gotoApp(page)

    await page.locator('.sidebar-item').first().click()
    await expect(page.locator('.bubble', { hasText: 'General Kenobi' })).toBeVisible({ timeout: 10000 })

    await page.reload()
    await page.waitForSelector('.app-layout', { timeout: 15000 })
    await expect(page.locator('.bubble', { hasText: 'General Kenobi' })).toBeVisible({ timeout: 10000 })
  })

  test('user switches the model in Settings and the top bar updates', async ({ page }) => {
    await mockBootstrap(page)
    let current = 'qwen3:8b'
    await page.route('**/model', (route, req) => {
      const u = new URL(req.url())
      if (!/\/model\/?$/.test(u.pathname)) return route.continue()
      if (req.method() === 'POST') { try { current = JSON.parse(req.postData() || '{}').model } catch { /* ignore */ } }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ model: current, available: ['qwen3:8b', 'llama3.2:3b'], vision_model: null }) })
    })
    await gotoApp(page)

    await page.locator('.app-header-btn[aria-label="Open settings"]').click()
    const target = page.locator('.model-list-item', { hasText: 'llama3.2:3b' })
    await target.click()
    await expect(target.locator('.model-list-item-check')).toBeVisible({ timeout: 10000 })

    await page.locator('[aria-label="Close settings"], .settings-close-btn').first().click()
    await expect(page.locator('.app-model-name')).toContainText(/llama/i)
  })

  test('user exports the current conversation as a markdown file', async ({ page }) => {
    await mockBootstrap(page)
    await sseRoute(page, 'data: {"choices":[{"delta":{"content":"Exportable reply."}}]}\n\ndata: [DONE]\n')
    await gotoApp(page)

    await send(page, 'hello')
    await expect(emberText(page)).toContainText('Exportable reply.', { timeout: 10000 })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[aria-label="Export conversation"]').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^ember-conversation-\d{4}-\d{2}-\d{2}\.md$/)
  })
})
