// Unit tests for the e2e vault swap / swap-back logic. No network, no live API:
// the client, sleep, clock and fs are fakes. Counts are exact on purpose.
// Each absence assertion (no retry, bound holds, record kept, no swap) has a
// positive control that makes the condition occur.
import { describe, it, expect } from 'vitest'
import swap from '../e2e/helpers/vault-swap.cjs'

const {
  withRetry, parseRetryAfter, runSetup, runTeardown, runTeardownLoud, restoreVault,
  VaultSwapError, VaultRestoreError, STATUS_URL, SWAP_URL,
} = swap

const REC = '/rec.json'

function res(status, { headers = {}, body = '' } = {}) {
  return {
    ok: () => status >= 200 && status < 300,
    status: () => status,
    headers: () => headers,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}
const statusRes = (label, devMode = true) =>
  res(200, { body: { active_vault: { label }, dev_mode: devMode } })
const ok = () => res(200, { body: {} })
const tooMany = (retryAfter) =>
  res(429, retryAfter == null ? {} : { headers: { 'retry-after': String(retryAfter) } })

// Scripted client: separate queues for GET and POST. A queue entry is a
// response, a function (called with the call log) returning one, or an Error.
function fakeClient({ get = [], post = [] } = {}) {
  const calls = []
  const take = (q, kind) => (url, opts) => {
    calls.push({ kind, url, data: opts?.data })
    if (!q.length) throw new Error(`unscripted ${kind} ${url}`)
    const next = q.shift()
    if (next instanceof Error) throw next
    return typeof next === 'function' ? next(calls) : next
  }
  return { calls, get: take(get, 'GET'), post: take(post, 'POST') }
}

function fakeIo(initial = {}) {
  const files = new Map(Object.entries(initial))
  return {
    files,
    readFileSync: (f) => { if (!files.has(f)) throw new Error('ENOENT'); return files.get(f) },
    writeFileSync: (f, c) => { files.set(f, c) },
    unlinkSync: (f) => { files.delete(f) },
  }
}
const record = (label) => JSON.stringify({ label, recordedAt: 'x' })

// Fake clock: sleep advances now, so the elapsed bound is exercised for real.
function fakeTime() {
  let t = 0
  const sleeps = []
  return { sleeps, now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms }, random: () => 0 }
}

function deps({ client, io = fakeIo(), env = {}, time = fakeTime(), retry = {} }) {
  return {
    d: {
      client, headers: {}, recordFile: REC, io, env, log: () => {}, now: time.now,
      retry: { sleep: time.sleep, now: time.now, random: time.random, ...retry },
    },
    io, time,
  }
}

describe('withRetry', () => {
  it('honors Retry-After across two 429s (2 sleeps, 3 calls)', async () => {
    const time = fakeTime()
    const q = [tooMany(2), tooMany(3), ok()]
    let n = 0
    const out = await withRetry(async () => { n++; return q.shift() }, time)
    expect(out.status()).toBe(200)
    expect(n).toBe(3)
    expect(time.sleeps).toEqual([2000, 3000])
  })

  it('backs off 500/1000/2000 when no Retry-After (3 sleeps, 4 calls)', async () => {
    const time = fakeTime()
    const q = [tooMany(), tooMany(), tooMany(), ok()]
    let n = 0
    await withRetry(async () => { n++; return q.shift() }, time)
    expect(n).toBe(4)
    expect(time.sleeps).toEqual([500, 1000, 2000])
  })

  it('clamps a huge Retry-After to one 65s window', async () => {
    const time = fakeTime()
    const q = [tooMany(600), ok()]
    await withRetry(async () => q.shift(), time)
    expect(time.sleeps).toEqual([65000])
  })

  it('stops at the bound: 4 attempts, 90000ms slept, then throws', async () => {
    const time = fakeTime()
    let n = 0
    const err = await withRetry(async () => { n++; return tooMany(30) }, { ...time, maxWaitMs: 90000 })
      .catch((e) => e)
    expect(err).toBeInstanceOf(VaultSwapError)
    expect(err.attempts).toBe(4)
    expect(err.elapsedMs).toBe(90000)
    expect(err.lastStatus).toBe(429)
    expect(n).toBe(4)
    expect(time.sleeps).toEqual([30000, 30000, 30000])
  })

  it('CONTROL: same 429 script with a wider bound resolves, so the bound test can fail', async () => {
    const time = fakeTime()
    const q = [tooMany(30), tooMany(30), tooMany(30), tooMany(30), ok()]
    const out = await withRetry(async () => q.shift(), { ...time, maxWaitMs: 200000 })
    expect(out.status()).toBe(200)
    expect(time.sleeps.reduce((a, b) => a + b, 0)).toBe(120000)
  })

  it('does not retry a 500 (1 call, 0 sleeps)', async () => {
    const time = fakeTime()
    let n = 0
    const out = await withRetry(async () => { n++; return res(500) }, time)
    expect(out.status()).toBe(500)
    expect(n).toBe(1)
    expect(time.sleeps).toEqual([])
  })

  it('CONTROL: a 429 does retry (sleep count is non-zero), so the 500 test can fail', async () => {
    const time = fakeTime()
    const q = [tooMany(1), ok()]
    await withRetry(async () => q.shift(), time)
    expect(time.sleeps).toEqual([1000])
  })

  it('retries a thrown network error once, then succeeds', async () => {
    const time = fakeTime()
    const q = [new Error('ECONNRESET'), ok()]
    const out = await withRetry(async () => {
      const next = q.shift()
      if (next instanceof Error) throw next
      return next
    }, time)
    expect(out.status()).toBe(200)
    expect(time.sleeps).toEqual([500])
  })

  it('parseRetryAfter reads seconds and HTTP dates', () => {
    expect(parseRetryAfter({ 'retry-after': '7' }, 0)).toBe(7000)
    expect(parseRetryAfter({ 'retry-after': new Date(5000).toUTCString() }, 2000)).toBe(3000)
    expect(parseRetryAfter({}, 0)).toBeNull()
  })
})

describe('runSetup', () => {
  it('records the label BEFORE the swap, then swaps and verifies (GET, POST, GET)', async () => {
    let recordedAtSwap = null
    const io = fakeIo()
    const client = fakeClient({
      get: [statusRes('alpha'), statusRes('test')],
      post: [() => { recordedAtSwap = io.files.get(REC); return ok() }],
    })
    const { d } = deps({ client, io })
    const out = await runSetup(d)
    expect(out).toEqual({ original: 'alpha', swapped: true })
    expect(JSON.parse(recordedAtSwap).label).toBe('alpha')
    expect(client.calls.map((c) => `${c.kind} ${c.url}`)).toEqual([
      `GET ${STATUS_URL}`, `POST ${SWAP_URL}`, `GET ${STATUS_URL}`,
    ])
    expect(client.calls[1].data).toEqual({ vault_label: 'test' })
  })

  it('on test with an earlier record: keeps its label, no swap (1 call)', async () => {
    const client = fakeClient({ get: [statusRes('test')] })
    const { d } = deps({ client, io: fakeIo({ [REC]: record('alpha') }) })
    expect(await runSetup(d)).toEqual({ original: 'alpha', swapped: false })
    expect(client.calls.map((c) => c.kind)).toEqual(['GET'])
  })

  it('on test with no record and no env: fails loudly, no swap, no record', async () => {
    const client = fakeClient({ get: [statusRes('test')] })
    const { d, io } = deps({ client })
    await expect(runSetup(d)).rejects.toThrow(/EMBER_RESTORE_VAULT/)
    expect(client.calls.map((c) => c.kind)).toEqual(['GET'])
    expect(io.files.size).toBe(0)
  })

  it('CONTROL: same state with EMBER_RESTORE_VAULT set does not throw and records it', async () => {
    const client = fakeClient({ get: [statusRes('test')] })
    const { d, io } = deps({ client, env: { EMBER_RESTORE_VAULT: 'zeta' } })
    expect(await runSetup(d)).toEqual({ original: 'zeta', swapped: false })
    expect(JSON.parse(io.files.get(REC)).label).toBe('zeta')
  })

  it('refuses when dev mode is off: no record, no swap', async () => {
    const client = fakeClient({ get: [statusRes('alpha', false)] })
    const { d, io } = deps({ client })
    await expect(runSetup(d)).rejects.toThrow(/dev mode is off/)
    expect(io.files.size).toBe(0)
    expect(client.calls.map((c) => c.kind)).toEqual(['GET'])
  })

  it('skips the guard on a non-ok status (404)', async () => {
    const client = fakeClient({ get: [res(404)] })
    const { d } = deps({ client })
    expect(await runSetup(d)).toEqual({ skipped: true })
  })

  it('fails when the swap returns ok but the vault did not change', async () => {
    const client = fakeClient({ get: [statusRes('alpha'), statusRes('alpha')], post: [ok()] })
    const { d } = deps({ client })
    await expect(runSetup(d)).rejects.toThrow(/active vault is 'alpha'/)
  })

  it('retries a 429 on the swap with Retry-After (1 sleep of 1000ms)', async () => {
    const client = fakeClient({ get: [statusRes('alpha'), statusRes('test')], post: [tooMany(1), ok()] })
    const { d, time } = deps({ client })
    await runSetup(d)
    expect(time.sleeps).toEqual([1000])
  })
})

describe('runTeardown', () => {
  it.each(['alpha', 'zeta'])('restores the recorded label %s exactly, verifies, clears record', async (label) => {
    const client = fakeClient({ get: [statusRes('test'), statusRes(label)], post: [ok()] })
    const { d, io } = deps({ client, io: fakeIo({ [REC]: record(label) }) })
    expect(await runTeardown(d)).toEqual({ restored: true, label })
    expect(client.calls[1].data).toEqual({ vault_label: label })
    expect(client.calls.map((c) => c.kind)).toEqual(['GET', 'POST', 'GET'])
    expect(JSON.stringify(client.calls.map((c) => c.data))).not.toContain('private_vault')
    expect(io.files.has(REC)).toBe(false)
  })

  it('retries two 429s honoring Retry-After, then restores (2 sleeps)', async () => {
    const client = fakeClient({ get: [statusRes('test'), statusRes('alpha')], post: [tooMany(1), tooMany(1), ok()] })
    const { d, time } = deps({ client, io: fakeIo({ [REC]: record('alpha') }) })
    await runTeardown(d)
    expect(time.sleeps).toEqual([1000, 1000])
  })

  it('fails loudly when verify finds the wrong vault; record is kept', async () => {
    const client = fakeClient({ get: [statusRes('test'), statusRes('test')], post: [ok()] })
    const { d, io } = deps({ client, io: fakeIo({ [REC]: record('alpha') }) })
    const err = await runTeardown(d).catch((e) => e)
    expect(err).toBeInstanceOf(VaultRestoreError)
    expect(err.expected).toBe('alpha')
    expect(err.actual).toBe('test')
    expect(err.message).toMatch(/Expected active vault 'alpha', found 'test'/)
    expect(io.files.has(REC)).toBe(true)
  })

  it('CONTROL: matching verify does not throw and clears the record', async () => {
    const client = fakeClient({ get: [statusRes('test'), statusRes('alpha')], post: [ok()] })
    const { d, io } = deps({ client, io: fakeIo({ [REC]: record('alpha') }) })
    await expect(runTeardown(d)).resolves.toMatchObject({ restored: true })
    expect(io.files.has(REC)).toBe(false)
  })

  it('exhausted 429s: VaultRestoreError with the manual curl, record kept (3 POSTs)', async () => {
    const client = fakeClient({ get: [statusRes('test')], post: [tooMany(40), tooMany(40), tooMany(40)] })
    const { d, io } = deps({ client, io: fakeIo({ [REC]: record('alpha') }), retry: { maxWaitMs: 90000 } })
    const err = await runTeardown(d).catch((e) => e)
    expect(err).toBeInstanceOf(VaultRestoreError)
    expect(err.message).toMatch(/Restore by hand: curl/)
    expect(err.message).toMatch(/"vault_label": "alpha"/)
    expect(io.files.has(REC)).toBe(true)
    expect(client.calls.filter((c) => c.kind === 'POST')).toHaveLength(3)
  })

  it('status unreadable with a record: fails loudly, record kept', async () => {
    const client = fakeClient({ get: [res(500)] })
    const { d, io } = deps({ client, io: fakeIo({ [REC]: record('alpha') }) })
    await expect(runTeardown(d)).rejects.toBeInstanceOf(VaultRestoreError)
    expect(io.files.has(REC)).toBe(true)
  })

  it('no record, on test, no env: fails loudly, no swap', async () => {
    const client = fakeClient({ get: [statusRes('test')] })
    const { d } = deps({ client })
    await expect(runTeardown(d)).rejects.toThrow(/EMBER_RESTORE_VAULT/)
    expect(client.calls.map((c) => c.kind)).toEqual(['GET'])
  })

  it('CONTROL: no record, on test, with env: swaps to the env label', async () => {
    const client = fakeClient({ get: [statusRes('test'), statusRes('zeta')], post: [ok()] })
    const { d } = deps({ client, env: { EMBER_RESTORE_VAULT: 'zeta' } })
    await runTeardown(d)
    expect(client.calls[1].data).toEqual({ vault_label: 'zeta' })
  })

  it('no record, on a non-test vault: nothing to do (1 call)', async () => {
    const client = fakeClient({ get: [statusRes('alpha')] })
    const { d } = deps({ client })
    expect(await runTeardown(d)).toEqual({ restored: false })
    expect(client.calls).toHaveLength(1)
  })

  it('already on the recorded label: no swap, record cleared', async () => {
    const client = fakeClient({ get: [statusRes('alpha')] })
    const { d, io } = deps({ client, io: fakeIo({ [REC]: record('alpha') }) })
    await runTeardown(d)
    expect(client.calls.map((c) => c.kind)).toEqual(['GET'])
    expect(io.files.has(REC)).toBe(false)
  })
})

describe('restoreVault', () => {
  it('swaps then reads back (POST, GET)', async () => {
    const client = fakeClient({ get: [statusRes('alpha')], post: [ok()] })
    const { d } = deps({ client })
    await restoreVault(d, 'alpha')
    expect(client.calls.map((c) => c.kind)).toEqual(['POST', 'GET'])
  })
})

describe('runTeardownLoud exit code', () => {
  it('failure: exitCode 1, one boxed message naming the vault, error rethrown', async () => {
    const client = fakeClient({ get: [statusRes('test'), statusRes('test')], post: [ok()] })
    const { d } = deps({ client, io: fakeIo({ [REC]: record('alpha') }) })
    const proc = { exitCode: 0 }
    const logged = []
    await expect(runTeardownLoud(d, { proc, logError: (m) => logged.push(m) }))
      .rejects.toBeInstanceOf(VaultRestoreError)
    expect(proc.exitCode).toBe(1)
    expect(logged).toHaveLength(1)
    expect(logged[0]).toMatch(/VAULT NOT RESTORED/)
    expect(logged[0]).toMatch(/Expected active vault 'alpha', found 'test'/)
  })

  it('CONTROL: success leaves exitCode 0 and logs nothing', async () => {
    const client = fakeClient({ get: [statusRes('test'), statusRes('alpha')], post: [ok()] })
    const { d } = deps({ client, io: fakeIo({ [REC]: record('alpha') }) })
    const proc = { exitCode: 0 }
    const logged = []
    await runTeardownLoud(d, { proc, logError: (m) => logged.push(m) })
    expect(proc.exitCode).toBe(0)
    expect(logged).toEqual([])
  })
})
