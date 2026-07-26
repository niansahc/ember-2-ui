// Chat failure surfaces — the regression suite for the mock-fallback bug.
//
// What went wrong: when a chat request failed, useChat silently switched to
// api/mock.js and streamed canned text into the assistant bubble as if the
// model had produced it. The canned pool included invented journal entries,
// an invented date the user supposedly wrote on, and a block of invented web
// search results. It fired for something as ordinary as the model server
// restarting overnight, and the only trace was a console.warn.
//
// Worse, apiAvailableRef latched false on the first failure and was never
// reset, so a single blip put the whole session into fabrication mode until
// the page was reloaded.
//
// These tests pin the replacement behavior: a visible, provider-aware error
// turn, a working retry, no fabricated content anywhere, and no latch. See
// ADR 0003.
//
// Default lane, mocked endpoints per ADR 0001. Synthetic fixtures only.

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const OK_BODY =
  'data: {"choices":[{"delta":{"content":"Real answer from the model."}}]}\n\ndata: [DONE]\n'

// Phrases lifted from the deleted mock pool. If any of these ever appear on
// screen again, the fallback is back.
const FABRICATION_TELLS = [
  'journal entries',
  'I remember you mentioning',
  "Here's what I found from searching the web",
  "I've been thinking about what you shared earlier",
]

const send = async (page, text) => {
  await page.locator('[aria-label="Message input"]').fill(text)
  await page.locator('[aria-label="Send message"]').click()
}

const gotoApp = async (page) => {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
}

const errorBubble = (page) => page.locator('[data-testid="chat-error"]')

/** Record every chat POST body so history contents can be asserted. */
function recordChatRequests(page) {
  const bodies = []
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/v1/chat/completions')) {
      try {
        bodies.push(JSON.parse(req.postData() || 'null'))
      } catch {
        bodies.push(null)
      }
    }
  })
  return bodies
}

/** Assert the transcript contains nothing from the old fabrication pool. */
async function expectNoFabrication(page) {
  const transcript = await page.locator('.chat-messages').innerText()
  for (const tell of FABRICATION_TELLS) {
    expect(transcript).not.toContain(tell)
  }
}

test.describe('Chat failures surface honestly', () => {
  test('unreachable backend shows an error turn, not invented content', async ({ page }) => {
    // route.abort() makes fetch reject exactly the way a dead backend process
    // does, which is the 'unreachable' branch rather than an HTTP status.
    await mockBootstrap(page)
    await page.route('**/v1/chat/completions', (route) => route.abort())
    await gotoApp(page)

    await send(page, 'Are you there?')

    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })
    await expect(errorBubble(page)).toContainText("I can't reach my backend right now")
    // Nothing answered, so the copy must not send the user chasing the model
    // provider — that was never involved.
    await expect(errorBubble(page)).not.toContainText('Ollama')
    await expectNoFabrication(page)

    // The UI must not be left mid-stream.
    await expect(page.locator('[aria-label="Send message"]')).toBeVisible()
    await expect(page.locator('.chat-typing')).toHaveCount(0)
  })

  test('500 on a local model names Ollama', async ({ page }) => {
    // The incident exactly: FastAPI up and answering health, model server down.
    await mockBootstrap(page, { health: { model: 'qwen3:8b' } })
    await page.route('**/v1/chat/completions', (route) =>
      route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' }),
    )
    await gotoApp(page)

    await send(page, 'What is 2 + 2?')

    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })
    await expect(errorBubble(page)).toContainText('My backend is up')
    await expect(errorBubble(page)).toContainText('Ollama')
    await expectNoFabrication(page)
  })

  test('500 on a cloud model names the cloud provider, never Ollama', async ({ page }) => {
    // The scalability case: telling a Claude user to start Ollama would be
    // confidently wrong advice.
    await mockBootstrap(page, { health: { model: 'claude-haiku-4-5-20251001' } })
    await page.route('**/v1/chat/completions', (route) =>
      route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' }),
    )
    await gotoApp(page)

    await send(page, 'What is 2 + 2?')

    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })
    await expect(errorBubble(page)).toContainText('Anthropic')
    await expect(errorBubble(page)).not.toContainText('Ollama')
  })

  test('401 points at the API key rather than the model', async ({ page }) => {
    await mockBootstrap(page)
    await page.route('**/v1/chat/completions', (route) =>
      route.fulfill({ status: 401, contentType: 'text/plain', body: 'Unauthorized' }),
    )
    await gotoApp(page)

    await send(page, 'Hello')

    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })
    await expect(errorBubble(page)).toContainText('API key')
  })

  test('the error turn offers no copy or regenerate affordance', async ({ page }) => {
    // Copying or regenerating a failure notice treats it as model output,
    // which is the conflation this whole change exists to prevent. One
    // explicit Try again button instead.
    await mockBootstrap(page)
    await page.route('**/v1/chat/completions', (route) => route.abort())
    await gotoApp(page)

    await send(page, 'Hello')
    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })

    // Scoped to the error's own row: the user's message bubble legitimately
    // keeps its copy button, so a page-wide count would prove nothing.
    const errorRow = page.locator('.bubble-row', {
      has: page.locator('[data-testid="chat-error"]'),
    })
    await expect(errorRow.locator('[aria-label="Try again"]')).toBeVisible()
    await expect(errorRow.locator('[aria-label="Copy message"]')).toHaveCount(0)
    await expect(errorRow.locator('[aria-label="Regenerate response"]')).toHaveCount(0)
  })

  test('Try again retries and replaces the error with the real reply', async ({ page }) => {
    await mockBootstrap(page)
    let failNext = true
    await page.route('**/v1/chat/completions', (route) => {
      if (failNext) {
        failNext = false
        return route.abort()
      }
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: OK_BODY })
    })
    await gotoApp(page)

    await send(page, 'Try me twice')
    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })

    await page.locator('[aria-label="Try again"]').click()

    // The error turn is replaced, not appended below.
    await expect(page.locator('.bubble-ember .bubble-markdown').last()).toContainText(
      'Real answer from the model.',
      { timeout: 10000 },
    )
    await expect(errorBubble(page)).toHaveCount(0)
  })

  test('a failure does not downgrade the rest of the session', async ({ page }) => {
    // The latch bug. apiAvailableRef used to flip false on the first failure
    // and was never reset, so every later message in the session was served
    // from the mock even after the backend came back.
    await mockBootstrap(page)
    const bodies = recordChatRequests(page)
    let failNext = true
    await page.route('**/v1/chat/completions', (route) => {
      if (failNext) {
        failNext = false
        return route.abort()
      }
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: OK_BODY })
    })
    await gotoApp(page)

    await send(page, 'First message')
    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })

    await send(page, 'Second message')

    await expect(page.locator('.bubble-ember .bubble-markdown').last()).toContainText(
      'Real answer from the model.',
      { timeout: 10000 },
    )
    // Two real attempts, so the second send went to the network rather than
    // being short-circuited into a local fallback.
    expect(bodies.length).toBe(2)
    await expectNoFabrication(page)
  })

  test('the error turn is never sent back to the model as history', async ({ page }) => {
    // Feeding UI-authored text back would have Ember reading "I can't reach my
    // backend right now" as something she said.
    await mockBootstrap(page)
    const bodies = recordChatRequests(page)
    let failNext = true
    await page.route('**/v1/chat/completions', (route) => {
      if (failNext) {
        failNext = false
        return route.abort()
      }
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: OK_BODY })
    })
    await gotoApp(page)

    await send(page, 'First message')
    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })

    await send(page, 'Second message')
    await expect(page.locator('.bubble-ember .bubble-markdown').last()).toContainText(
      'Real answer from the model.',
      { timeout: 10000 },
    )

    const second = bodies[1]
    expect(second).toBeTruthy()
    const serialized = JSON.stringify(second.messages)
    expect(serialized).not.toContain("can't reach my backend")
    // The user's own turns must still be there — filtering error turns must
    // not take real history with them.
    expect(serialized).toContain('First message')
    expect(serialized).toContain('Second message')
  })

  test('the error turn fits a phone viewport', async ({ page }) => {
    // CLAUDE.md mobile gate. 360px is a common Android width. The retry button
    // goes full width below 600px, so the risk is it pushing the row wider
    // than the viewport and triggering horizontal scroll.
    await page.setViewportSize({ width: 360, height: 740 })
    await mockBootstrap(page)
    await page.route('**/v1/chat/completions', (route) => route.abort())
    await gotoApp(page)

    await send(page, 'Hello')
    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })

    const box = await errorBubble(page).boundingBox()
    expect(box).not.toBeNull()
    expect(box.x + box.width).toBeLessThanOrEqual(360)

    // The retry button must still be reachable and tappable, not clipped.
    const retry = page.locator('[aria-label="Try again"]')
    await expect(retry).toBeVisible()
    const retryBox = await retry.boundingBox()
    expect(retryBox.x + retryBox.width).toBeLessThanOrEqual(360)

    // And the page itself must not scroll sideways.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  })

  test('a failed conversation load shows an error, not an invented transcript', async ({ page }) => {
    // mockGetMessages used to fabricate a whole past conversation here, which
    // reads as the user's own history rather than as one bad answer.
    const convo = {
      id: 'sess_synthetic01',
      title: 'Synthetic Conversation',
      updated_at: new Date().toISOString(),
      project_id: null,
    }
    await mockBootstrap(page, { conversations: [convo] })
    await page.route(/\/conversations\/[^/?]+$/, (route, req) =>
      req.method() === 'GET'
        ? route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' })
        : route.continue(),
    )
    await gotoApp(page)

    await page.locator('.sidebar-item').first().click()

    await expect(errorBubble(page)).toBeVisible({ timeout: 10000 })
    await expect(errorBubble(page)).toContainText("I couldn't load that conversation")
    await expectNoFabrication(page)
  })
})
