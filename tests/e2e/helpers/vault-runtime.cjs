// Wires vault-swap.cjs to the real world: Playwright request context, the
// .env API key, the on-disk record file. Used by global-setup, global-teardown
// and scripts/e2e-restore-vault.cjs. Nothing here is unit-tested because it is
// only glue; the logic lives in vault-swap.cjs.

const fs = require('fs')
const path = require('path')
const { request } = require('@playwright/test')
const { safeCall } = require('./redact.cjs')

// Repo root, NOT test-results/: Playwright clears its output dir at run start,
// which would delete the record from an interrupted previous run.
const RECORD_FILE = path.resolve(__dirname, '..', '..', '..', '.e2e-vault-original.json')

function getApiKey() {
  const envPath = path.resolve(__dirname, '..', '..', '..', '.env')
  try {
    const match = fs.readFileSync(envPath, 'utf8').match(/VITE_EMBER_API_KEY=(.+)/)
    if (match) return match[1].trim()
  } catch {}
  return ''
}

async function makeDeps() {
  const key = getApiKey()
  const ctx = await request.newContext()
  return {
    ctx,
    deps: {
      // safeCall redacts the Authorization header out of thrown call logs.
      client: {
        get: (url, opts) => safeCall(() => ctx.get(url, opts)),
        post: (url, opts) => safeCall(() => ctx.post(url, opts)),
      },
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      recordFile: RECORD_FILE,
      io: fs,
      env: process.env,
      log: console.log,
      retry: {},
      now: Date.now,
    },
  }
}

// Set by the unmocked-request measurement run: nothing is listening on :8000
// on purpose, so setup/teardown must not try to reach it.
const NO_BACKEND = !!process.env.EMBER_E2E_NO_BACKEND

module.exports = { makeDeps, RECORD_FILE, NO_BACKEND }
