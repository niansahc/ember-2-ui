// Vault swap / swap-back logic for the e2e global setup and teardown.
//
// Why this exists: the suite swaps the live API onto the 'test' vault and has
// to put it back. The old teardown hardcoded 'private_vault', never retried,
// and only warned on failure, so three 429s left the live API on the test
// vault with a green run. Everything here is pure: the HTTP client, sleep,
// clock, fs and logger are injected, so the whole thing is unit-tested
// (tests/unit/vault-swap.test.js) without touching a live API.
//
// The client is a Playwright APIRequestContext-shaped object:
//   client.get(url, {headers}) / client.post(url, {headers, data})
// returning something with ok(), status(), headers(), json(), text().

const API_URL = 'http://localhost:8000/v1'
const STATUS_URL = `${API_URL}/developer/status`
const SWAP_URL = `${API_URL}/developer/vault/swap`
const TEST_LABEL = 'test'

// slowapi uses a fixed 60s window, so one full window always clears a 429.
const RETRY_AFTER_CAP_MS = 65000

class VaultSwapError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'VaultSwapError'
    Object.assign(this, details)
  }
}

class VaultRestoreError extends VaultSwapError {
  constructor(message, details = {}) {
    super(message, details)
    this.name = 'VaultRestoreError'
  }
}

/** Retry-After header (seconds or HTTP date) to milliseconds, or null. */
function parseRetryAfter(headers, nowMs) {
  const raw = headers && (headers['retry-after'] ?? headers['Retry-After'])
  if (raw == null || raw === '') return null
  const secs = Number(raw)
  if (Number.isFinite(secs) && secs >= 0) return Math.min(secs * 1000, RETRY_AFTER_CAP_MS)
  const when = Date.parse(raw)
  if (Number.isNaN(when)) return null
  return Math.min(Math.max(when - nowMs, 0), RETRY_AFTER_CAP_MS)
}

/**
 * Run fn() until it returns a non-429 response. Retries on a 429 response and
 * on a thrown (network) error; any other response is returned for the caller to
 * judge. Total time spent is bounded by maxWaitMs: when the next delay would
 * cross the bound this throws instead of sleeping.
 */
async function withRetry(fn, opts = {}) {
  const {
    maxWaitMs = 90000,
    baseMs = 500,
    factor = 2,
    maxBackoffMs = 15000,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    now = () => Date.now(),
    random = Math.random,
  } = opts
  const start = now()
  let attempts = 0
  let lastStatus = null
  let lastError = null

  for (;;) {
    attempts += 1
    let delay
    try {
      const res = await fn()
      if (res.status() !== 429) return res
      lastStatus = 429
      lastError = null
      delay = parseRetryAfter(res.headers(), now())
    } catch (err) {
      lastError = err
      lastStatus = null
      delay = null
    }
    if (delay == null) {
      const backoff = Math.min(baseMs * factor ** (attempts - 1), maxBackoffMs)
      delay = backoff + Math.floor(random() * baseMs)
    }
    const elapsed = now() - start
    if (elapsed + delay > maxWaitMs) {
      throw new VaultSwapError(
        `Gave up after ${attempts} attempt(s) over ${elapsed}ms (bound ${maxWaitMs}ms); ` +
        (lastStatus ? `last HTTP status ${lastStatus}.` : `last error: ${lastError?.message}.`),
        { attempts, elapsedMs: elapsed, lastStatus, cause: lastError },
      )
    }
    await sleep(delay)
  }
}

// ── record file: the label to restore, written before any swap ───────────────

function readRecord(file, io) {
  try {
    const parsed = JSON.parse(io.readFileSync(file, 'utf8'))
    return typeof parsed?.label === 'string' && parsed.label ? parsed : null
  } catch {
    return null
  }
}

function writeRecord(file, label, io, now = Date.now) {
  io.writeFileSync(file, JSON.stringify({ label, recordedAt: new Date(now()).toISOString() }))
}

function clearRecord(file, io) {
  try { io.unlinkSync(file) } catch {}
}

// ── status / swap / restore ──────────────────────────────────────────────────

async function fetchStatus(d) {
  const res = await withRetry(() => d.client.get(STATUS_URL, { headers: d.headers }), d.retry)
  if (!res.ok()) return { ok: false, httpStatus: res.status() }
  const body = await res.json()
  return { ok: true, label: body?.active_vault?.label, devMode: !!body?.dev_mode }
}

async function swapTo(d, label) {
  const res = await withRetry(() => d.client.post(SWAP_URL, {
    headers: { ...d.headers, 'Content-Type': 'application/json' },
    data: { vault_label: label },
  }), d.retry)
  if (!res.ok()) {
    throw new VaultSwapError(
      `Swap to '${label}' failed: HTTP ${res.status()} ${await res.text()}`,
      { lastStatus: res.status() },
    )
  }
}

/** Swap to label, then read the active vault back and require it to match. */
async function restoreVault(d, label) {
  await swapTo(d, label)
  const after = await fetchStatus(d)
  if (!after.ok || after.label !== label) {
    throw new VaultRestoreError(
      `Vault restore NOT verified. Expected active vault '${label}', ` +
      `found ${after.ok ? `'${after.label}'` : `unreadable status (HTTP ${after.httpStatus})`}.`,
      { expected: label, actual: after.ok ? after.label : null },
    )
  }
}

function manualRestoreHint(label) {
  return (
    `Restore by hand: curl -X POST ${SWAP_URL} -H "Authorization: Bearer <key>" ` +
    `-H "Content-Type: application/json" -d '{"vault_label": "${label}"}'`
  )
}

/**
 * Global setup. Records the active label to restoreFile BEFORE swapping so a
 * crash mid-swap still leaves a restore target.
 * d: { client, headers, recordFile, io, env, log, retry, now }
 */
async function runSetup(d) {
  const { log = console.log, env = {}, recordFile, io } = d
  const status = await fetchStatus(d)
  if (!status.ok) {
    log(`[global-setup] ${STATUS_URL} returned ${status.httpStatus}. Skipping vault guard.`)
    return { skipped: true }
  }
  const { label } = status
  if (typeof label !== 'string' || !label) {
    throw new VaultSwapError('Backend status carried no active vault label; refusing to run.')
  }

  if (label === TEST_LABEL) {
    const record = readRecord(recordFile, io)
    if (record) {
      log(`[global-setup] On test vault with a record from an earlier run. Will restore '${record.label}'.`)
      return { original: record.label, swapped: false }
    }
    if (env.EMBER_RESTORE_VAULT && env.EMBER_RESTORE_VAULT !== TEST_LABEL) {
      writeRecord(recordFile, env.EMBER_RESTORE_VAULT, io, d.now)
      log(`[global-setup] On test vault, no record. Using EMBER_RESTORE_VAULT='${env.EMBER_RESTORE_VAULT}'.`)
      return { original: env.EMBER_RESTORE_VAULT, swapped: false }
    }
    throw new VaultSwapError(
      `Backend is already on the 'test' vault and no record of the original vault exists, so the ` +
      `suite cannot know where to restore. Set EMBER_RESTORE_VAULT=<label> (the vault to restore ` +
      `after the run) and rerun. No label is assumed.`,
    )
  }

  if (!status.devMode) {
    throw new VaultSwapError(
      `Backend is not on the test vault (current: '${label}') and dev mode is off. ` +
      `Enable EMBER_DEV_MODE=true in the backend .env and swap to the test vault before running tests.`,
    )
  }

  writeRecord(recordFile, label, io, d.now)
  log(`[global-setup] Recorded '${label}'. Swapping to '${TEST_LABEL}'...`)
  await swapTo(d, TEST_LABEL)
  const after = await fetchStatus(d)
  if (!after.ok || after.label !== TEST_LABEL) {
    throw new VaultSwapError(
      `Swap to '${TEST_LABEL}' returned ok but the active vault is ` +
      `${after.ok ? `'${after.label}'` : 'unreadable'}. ${manualRestoreHint(label)}`,
    )
  }
  log(`[global-setup] On test vault. Will restore '${label}' afterward.`)
  return { original: label, swapped: true }
}

/**
 * Global teardown / manual restore. Restores the recorded label, verifies, and
 * removes the record only after the verified restore. Throws on any failure.
 */
async function runTeardown(d) {
  const { log = console.log, env = {}, recordFile, io } = d
  const record = readRecord(recordFile, io)
  const status = await fetchStatus(d)

  if (!status.ok) {
    if (!record) {
      log(`[global-teardown] Status returned ${status.httpStatus} and nothing was swapped. Nothing to restore.`)
      return { restored: false }
    }
    throw new VaultRestoreError(
      `Cannot read vault status (HTTP ${status.httpStatus}) to verify restore of '${record.label}'. ` +
      manualRestoreHint(record.label),
      { expected: record.label, actual: null, lastStatus: status.httpStatus },
    )
  }

  let target = record?.label
  if (!target) {
    if (status.label !== TEST_LABEL) {
      log(`[global-teardown] On '${status.label}', no record. Nothing to restore.`)
      return { restored: false }
    }
    target = env.EMBER_RESTORE_VAULT
    if (!target || target === TEST_LABEL) {
      throw new VaultRestoreError(
        `Backend is on the 'test' vault and there is no record of the original. ` +
        `Rerun with EMBER_RESTORE_VAULT=<label>. No label is assumed.`,
        { expected: null, actual: TEST_LABEL },
      )
    }
  }

  if (status.label === target) {
    clearRecord(recordFile, io)
    log(`[global-teardown] Already on '${target}'. Record cleared.`)
    return { restored: false, label: target }
  }

  log(`[global-teardown] On '${status.label}'. Restoring '${target}'...`)
  try {
    await restoreVault(d, target)
  } catch (err) {
    if (err instanceof VaultRestoreError) throw err
    throw new VaultRestoreError(
      `Restore of '${target}' failed: ${err.message} Active vault was '${status.label}'. ` +
      manualRestoreHint(target),
      { expected: target, actual: status.label, lastStatus: err.lastStatus ?? null, cause: err },
    )
  }
  clearRecord(recordFile, io)
  log(`[global-teardown] Restored '${target}' (verified).`)
  return { restored: true, label: target }
}

/**
 * Teardown entry point: runs runTeardown and, on failure, prints one boxed
 * message, sets proc.exitCode = 1 and rethrows. Success leaves exitCode alone.
 * proc/logError are injected so this is unit-testable.
 */
async function runTeardownLoud(d, { proc = process, logError = console.error } = {}) {
  try {
    return await runTeardown(d)
  } catch (err) {
    const bar = '!'.repeat(72)
    logError(`
${bar}
[global-teardown] VAULT NOT RESTORED
${err.message}
${bar}
`)
    proc.exitCode = 1
    throw err
  }
}

module.exports = {
  API_URL, STATUS_URL, SWAP_URL, TEST_LABEL, RETRY_AFTER_CAP_MS,
  VaultSwapError, VaultRestoreError,
  parseRetryAfter, withRetry,
  readRecord, writeRecord, clearRecord,
  fetchStatus, swapTo, restoreVault, runSetup, runTeardown, runTeardownLoud,
}
