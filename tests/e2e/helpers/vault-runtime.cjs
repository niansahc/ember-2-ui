// Wires vault-swap.cjs to the real world: Playwright request context, the
// .env API key, the on-disk record file. Used by global-setup, global-teardown
// and scripts/e2e-restore-vault.cjs. Nothing here is unit-tested because it is
// only glue; the logic lives in vault-swap.cjs.

const fs = require('fs')
const path = require('path')
const { request } = require('@playwright/test')
const { safeCall } = require('./redact.cjs')
const { authHeaders } = require('./testvault.cjs')

// Repo root, NOT test-results/: Playwright clears its output dir at run start,
// which would delete the record from an interrupted previous run.
const RECORD_FILE = path.resolve(__dirname, '..', '..', '..', '.e2e-vault-original.json')

async function makeDeps() {
  const ctx = await request.newContext()
  return {
    ctx,
    deps: {
      // safeCall redacts the Authorization header out of thrown call logs.
      client: {
        get: (url, opts) => safeCall(() => ctx.get(url, opts)),
        post: (url, opts) => safeCall(() => ctx.post(url, opts)),
      },
      headers: authHeaders(),
      recordFile: RECORD_FILE,
      io: fs,
      env: process.env,
    },
  }
}

// Set by the unmocked-request measurement run: nothing is listening on :8000
// on purpose, so setup/teardown must not try to reach it.
const NO_BACKEND = !!process.env.EMBER_E2E_NO_BACKEND

module.exports = { makeDeps, NO_BACKEND }
