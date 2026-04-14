// Playwright global teardown — runs once after all tests complete.
//
// Swaps the backend back to the user's personal vault (private_vault) so
// the user isn't left on the test vault after a test run. Requires G's
// swap-back endpoint (commit cc798be) — backend must be restarted after
// pulling that change for this teardown to succeed.
//
// Best-effort: if the swap-back fails, logs a clear warning but does not
// fail the test run. The user can manually swap back via curl if needed.

const { request } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const API_URL = 'http://localhost:8000/v1'
const PERSONAL_VAULT_LABEL = 'private_vault'

function getApiKey() {
  const envPath = path.resolve(__dirname, '..', '..', '.env')
  try {
    const content = fs.readFileSync(envPath, 'utf8')
    const match = content.match(/VITE_EMBER_API_KEY=(.+)/)
    if (match) return match[1].trim()
  } catch {}
  return ''
}

module.exports = async () => {
  const key = getApiKey()
  const headers = key ? { Authorization: `Bearer ${key}` } : {}
  const ctx = await request.newContext()

  try {
    const statusRes = await ctx.get(`${API_URL}/developer/status`, { headers })
    if (!statusRes.ok()) {
      console.warn(`[global-teardown] /v1/developer/status returned ${statusRes.status()}. Skipping swap-back.`)
      return
    }

    const status = await statusRes.json()
    const currentLabel = status?.active_vault?.label

    if (currentLabel === PERSONAL_VAULT_LABEL) {
      console.log('[global-teardown] Already on private_vault. No swap needed.')
      return
    }

    console.log(`[global-teardown] Currently on '${currentLabel}'. Swapping back to '${PERSONAL_VAULT_LABEL}'...`)
    const swapRes = await ctx.post(`${API_URL}/developer/vault/swap`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { vault_label: PERSONAL_VAULT_LABEL },
    })

    if (swapRes.ok()) {
      console.log('[global-teardown] Swapped back to private_vault.')
    } else {
      const body = await swapRes.text()
      console.warn(
        `[global-teardown] Swap-back failed: ${swapRes.status()} ${body}. ` +
        `Backend may need a restart to pick up the swap-back endpoint (commit cc798be). ` +
        `You are still on the '${currentLabel}' vault.`,
      )
    }
  } catch (err) {
    console.warn(`[global-teardown] Unexpected error: ${err.message}. You may still be on the test vault.`)
  } finally {
    await ctx.dispose()
  }
}
