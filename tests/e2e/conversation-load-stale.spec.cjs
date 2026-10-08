// Stale conversation loads must not overwrite a newer selection.
//
// Click A (held response), then B (immediate response). B renders first; when
// A's response is released it must be discarded, not painted over B. Same for
// "New conversation" clicked while a load is in flight.
//
// A's route is held on a gate rather than a fixed delay: the test releases it
// at exactly the point it wants, so there's no sleep and no timing guess.
//
// The "A never appears" checks are absence assertions, so they wait for A's
// response to finish and React to flush before asserting, and the file
// carries a positive control: A on its own, through the same gated route,
// does render. All content is synthetic (Vault Privacy Rule).

const { test, expect } = require('@playwright/test')
const { mockBootstrap, mockConversationTurns, gate } = require('./helpers/mock-bootstrap.cjs')

const now = new Date().toISOString()
const SLOW = { id: 'sess_staleslow0001', title: 'Synthetic slow conversation', updated_at: now, project_id: null }
const FAST = { id: 'sess_stalefast0001', title: 'Synthetic fast conversation', updated_at: now, project_id: null }

const turn = (id, content) => [{ id: `${id}-t1`, role: 'user', content, timestamp: '2026-10-01T12-00-01-000001' }]

async function setup(page) {
  const slowGate = gate()
  await mockBootstrap(page, { conversations: [SLOW, FAST] })
  await mockConversationTurns(page, (id) =>
    id === SLOW.id
      ? { turns: turn(SLOW.id, 'Synthetic slow turn'), gate: slowGate.promise }
      : { turns: turn(FAST.id, 'Synthetic fast turn') },
  )
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  return slowGate
}

const row = (page, convo) => page.locator('.sidebar-item', { hasText: convo.title })

// Release A's held response, wait until the browser has fully received it,
// then let React flush two frames so a missing guard would have painted by now.
async function releaseSlowAndSettle(page, slowGate) {
  const slowDone = page.waitForResponse((r) => r.url().endsWith(SLOW.id))
  slowGate.release()
  await (await slowDone).finished()
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}

test.describe('Stale conversation loads', () => {
  test('positive control: the slow conversation renders when nothing supersedes it', async ({ page }) => {
    const slowGate = await setup(page)
    await row(page, SLOW).click()
    await releaseSlowAndSettle(page, slowGate)
    await expect(page.locator('.bubble', { hasText: 'Synthetic slow turn' })).toBeVisible()
  })

  test('a slow load for A does not overwrite a later selection of B', async ({ page }) => {
    const slowGate = await setup(page)
    await row(page, SLOW).click()
    await row(page, FAST).click()
    await expect(page.locator('.bubble', { hasText: 'Synthetic fast turn' })).toBeVisible({ timeout: 10000 })

    await releaseSlowAndSettle(page, slowGate)
    await expect(page.locator('.bubble', { hasText: 'Synthetic slow turn' })).toHaveCount(0)
    await expect(page.locator('.bubble', { hasText: 'Synthetic fast turn' })).toBeVisible()
  })

  test('a slow load does not overwrite a new conversation started after it', async ({ page }) => {
    const slowGate = await setup(page)
    await row(page, SLOW).click()
    // Sidebar closes on select on narrow viewports; the top-level button is
    // the first "New conversation" control either way.
    await page.getByRole('button', { name: 'New conversation' }).first().click()

    await releaseSlowAndSettle(page, slowGate)
    await expect(page.locator('.bubble', { hasText: 'Synthetic slow turn' })).toHaveCount(0)
    await expect(page.locator('.chat-empty')).toBeVisible()
  })
})
