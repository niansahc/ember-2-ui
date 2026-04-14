// Playwright global setup — runs once before any test.
//
// Asserts the backend is pointed at the 'test' vault before any test runs.
// Prevents accidental writes to the user's personal vault during e2e runs.
//
// If the backend is not on the test vault, this swaps to it. If the swap
// endpoint is unavailable or the backend is unreachable, fails loudly so
// tests don't run against the wrong vault.
//
// Known backend gap: there is no API to swap back to the 'default' vault.
// An API restart is required after testing. Flagged for G.

const { request } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const API_URL = 'http://localhost:8000/v1'

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
      console.warn(
        `[global-setup] /v1/developer/status returned ${statusRes.status()}. ` +
        `Skipping vault guard — mock-based tests will still run, but backend-hitting tests may fail.`,
      )
      return
    }

    const status = await statusRes.json()
    const label = status?.active_vault?.label

    if (label === 'test') {
      console.log('[global-setup] Backend is on test vault. Safe to proceed.')
      return
    }

    if (!status?.dev_mode) {
      throw new Error(
        `Backend is not on test vault (current: '${label}') and dev mode is off. ` +
        `Enable EMBER_DEV_MODE=true in the backend .env and swap to the test vault before running tests.`,
      )
    }

    console.log(`[global-setup] Backend is on '${label}' vault. Swapping to 'test'...`)
    const swapRes = await ctx.post(`${API_URL}/developer/vault/swap`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { vault_label: 'test' },
    })
    if (!swapRes.ok()) {
      const body = await swapRes.text()
      throw new Error(
        `Failed to swap to test vault: ${swapRes.status()} ${body}. ` +
        `Playwright will not run to protect your personal vault.`,
      )
    }
    console.log('[global-setup] Swapped to test vault. Safe to proceed.')
  } finally {
    await ctx.dispose()
  }
}
