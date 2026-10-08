// SSE contract v3 (ADR-040) â€” error frames and the vault badge.
//
// Covers the UI half of two behaviours:
//   1. An error frame surfaces its message in the conversation view, and
//      tokens rendered before it stay on screen.
//   2. The "Source: Vault" badge is derived from the presence of a
//      vault_sources frame, not from the x-ember-vault-used header.
//
// The badge-absent test is an absence assertion, so it ships with a positive
// control (CLAUDE.md, Testing Discipline): both tests stream the exact same
// fixture through the same builder, differing only by the vault_sources frame.
// If the badge check were vacuous â€” wrong selector, badge never rendered â€” the
// control goes red. All fixture content is synthetic (Vault Privacy Rule).

const { test, expect } = require('@playwright/test')
const { mockBootstrap } = require('./helpers/mock-bootstrap.cjs')

const delta = (content) => ({ choices: [{ delta: { content } }] })
const STOP = { choices: [{ delta: {}, finish_reason: 'stop' }] }

function sseBody(frames) {
  return frames.map((f) => `data: ${JSON.stringify(f)}\n`).join('') + 'data: [DONE]\n'
}

// Every header says "no vault", so the only thing that can light the badge is
// the vault_sources frame itself.
async function mockChat(page, frames) {
  await page.route('**/v1/chat/completions', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'x-ember-web-search': 'false',
        'x-ember-vault-used': 'false',
        'x-ember-vision-used': 'false',
      },
      body: sseBody(frames),
    }),
  )
}

async function openAndSend(page, text) {
  await page.goto('/')
  await page.waitForSelector('.app-layout', { timeout: 15000 })
  await page.locator('[aria-label="Message input"]').fill(text)
  await page.locator('[aria-label="Send message"]').click()
}

// One fixture, toggled. Keeps the control honest: the only difference
// between the two badge tests is the frame under test.
function vaultFixture({ withVaultSources }) {
  return [
    delta('Synthetic'),
    ...(withVaultSources
      ? [{ type: 'vault_sources', sources: [{ id: 'syn-1', title: 'Synthetic note' }] }]
      : []),
    delta(' reply'),
    STOP,
  ]
}

const lastEmberBubble = (page) => page.locator('.bubble-row-ember').last()

test.describe('SSE contract v3 â€” error frames', () => {
  test('error frame message renders in the conversation view', async ({ page }) => {
    await mockBootstrap(page)
    await mockChat(page, [
      { type: 'error', code: 'synthetic_failure_code', message: 'Synthetic generation failure' },
    ])
    await openAndSend(page, 'trigger an error')

    const error = page.locator('[data-testid="chat-error"]')
    await expect(error).toBeVisible({ timeout: 10000 })
    await expect(error).toContainText('Synthetic generation failure')
    // The code is backend diagnostics; it must never reach the DOM.
    await expect(page.locator('body')).not.toContainText('synthetic_failure_code')
  })

  test('tokens rendered before an error frame remain on screen after it', async ({ page }) => {
    await mockBootstrap(page)
    await mockChat(page, [
      delta('Partial'),
      delta(' synthetic'),
      delta(' answer'),
      { type: 'error', code: 'synthetic_failure_code', message: 'Synthetic mid-stream failure' },
    ])
    await openAndSend(page, 'fail halfway')

    // Wait for the error to land first, so the token check runs *after* it.
    const error = page.locator('[data-testid="chat-error"]')
    await expect(error).toContainText('Synthetic mid-stream failure', { timeout: 10000 })
    // The partial tokens are Ember's words: they stay in a normal Ember
    // bubble, not folded into the UI-authored error turn (ADR 0003).
    const tokens = page.locator('.bubble-ember:not(.bubble-error)', { hasText: 'Partial synthetic answer' })
    await expect(tokens).toHaveCount(1)
    await expect(error).not.toContainText('Partial synthetic answer')
  })
})

test.describe('SSE contract v3 â€” vault badge from vault_sources', () => {
  test('badge is set when a vault_sources frame arrives (positive control)', async ({ page }) => {
    await mockBootstrap(page)
    await mockChat(page, vaultFixture({ withVaultSources: true }))
    await openAndSend(page, 'ask the vault')

    const row = lastEmberBubble(page)
    await expect(row).toContainText('Synthetic reply', { timeout: 10000 })
    await expect(row.getByRole('button', { name: 'Regenerate response' })).toBeVisible()
    await expect(row.locator('[data-testid="bubble-source-value"]')).toHaveText('Vault')
  })

  test('badge is absent when no vault_sources frame arrives', async ({ page }) => {
    await mockBootstrap(page)
    await mockChat(page, vaultFixture({ withVaultSources: false }))
    await openAndSend(page, 'no vault here')

    const row = lastEmberBubble(page)
    // Stream fully finished before asserting absence: the badge is applied
    // after the loop ends, and Regenerate only appears once isStreaming drops.
    // Without this wait the check could pass simply because it ran too early.
    await expect(row).toContainText('Synthetic reply', { timeout: 10000 })
    await expect(row.getByRole('button', { name: 'Regenerate response' })).toBeVisible()
    await expect(row.locator('[data-testid="bubble-source-label"]')).toHaveCount(0)
  })
})
