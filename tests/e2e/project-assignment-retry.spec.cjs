// Deferred project assignment — retry-once behavior (issue #20).
//
// When a conversation is started from a project view, the session isn't
// created on the backend until the first message is sent, so the project
// assignment (PATCH /v1/conversations/{id}) is deferred to after the stream
// completes. That first PATCH can race the server-side session write, so
// useChat retries it exactly once before giving up.
//
// This spec arms a pending project via the UI, aborts the FIRST move attempt,
// fulfills the SECOND with 200, and asserts the move endpoint was hit at least
// twice — proving the single retry fired. Fully self-contained with synthetic
// fixtures (Vault Privacy Rule — no real vault data).

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const PROJECT = {
  id: 'proj_retrytest01',
  name: 'Synthetic Retry Project',
  color: '#ff8c00',
  conversation_count: 0,
}

test.describe('Deferred project assignment retry (#20)', () => {
  test('retries the move once when the first attempt fails', async ({ page }) => {
    await mockBootstrap(page, { projects: [PROJECT] })

    // Streamable 200 so sendMessage stays in the real-API branch and reaches
    // the deferred-assignment block (a non-200 would trip the mock fallback).
    await page.route('**/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n',
      })
    })

    // Count attempts at the move endpoint. PATCH /v1/conversations/{id} with a
    // project_id body is the move call (rename/delete also PATCH/DELETE this
    // path, so guard on method + body). Abort the 1st, fulfill the 2nd 200.
    let moveAttempts = 0
    await page.route(/\/conversations\/[^/?]+$/, async (route, request) => {
      if (request.method() !== 'PATCH') return route.continue()
      let body = {}
      try { body = JSON.parse(request.postData() || '{}') } catch {}
      if (!('project_id' in body)) return route.continue()

      moveAttempts += 1
      if (moveAttempts === 1) {
        await route.abort()
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'sess_x', project_id: PROJECT.id }),
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('.app-layout', { timeout: 15000 })

    // Enter the project detail view, then start a new conversation in it —
    // this arms pendingProject so the post-stream block fires.
    await page.locator('.sidebar-project-row').first().click()
    await page
      .locator('[aria-label="Start new conversation in this project"]')
      .click()

    // Send a message — its stream completion triggers the deferred assignment.
    await page.locator('[aria-label="Message input"]').fill('Hello from a project')
    await page.locator('[aria-label="Send message"]').click()

    // The single retry means the move endpoint is hit at least twice.
    await expect.poll(() => moveAttempts, { timeout: 8000 }).toBeGreaterThanOrEqual(2)
  })
})
