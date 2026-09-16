// Tests for tests/e2e/helpers/redact.cjs.
//
// ember-2#188: Playwright's APIRequestContext embeds a full "Call log" —
// including the Authorization header — in the .message of any error it
// throws (e.g. ECONNREFUSED when the backend is down). That printed a real
// Ember API key into a session transcript and required rotation. This spec
// verifies the fix: redactSecrets() masks the header, and safeCall() applies
// that redaction to a genuinely-thrown Playwright error, not just a mocked
// approximation of one.
//
// No live backend and no page needed — these are pure-logic + real-network-
// failure assertions, so they run as plain `test()` blocks. Only synthetic,
// non-real tokens are used (Vault Privacy Rule spirit: never exercise
// security-sensitive tests with real secrets).

const { test, expect } = require('@playwright/test')
const { request } = require('@playwright/test')
const { redactSecrets, safeCall, REDACTED } = require('./helpers/redact.cjs')

test.describe('redactSecrets', () => {
  test('masks "Authorization: Bearer <token>" as it appears in a Playwright call log', () => {
    const callLog = [
      'Call log:',
      '  - → GET http://localhost:8000/v1/developer/status',
      '    - user-agent: Playwright/1.59.1 (x64; windows 10.0) node/24.14',
      '    - accept: */*',
      '    - Authorization: Bearer sk-fixture-not-a-real-key-12345',
    ].join('\n')

    const redacted = redactSecrets(callLog)

    expect(redacted).toContain(`Authorization: ${REDACTED}`)
    expect(redacted).not.toContain('sk-fixture-not-a-real-key-12345')
  })

  test('masks a bare "Bearer <token>" not preceded by an Authorization label', () => {
    const redacted = redactSecrets('curl -H "Bearer sk-fixture-token-abc"')
    expect(redacted).toContain(`Bearer ${REDACTED}`)
    expect(redacted).not.toContain('sk-fixture-token-abc')
  })

  test('is case-insensitive on both the header name and the scheme', () => {
    const redacted = redactSecrets('AUTHORIZATION: bearer sk-fixture-token-xyz')
    expect(redacted.toLowerCase()).toContain('[redacted]')
    expect(redacted).not.toContain('sk-fixture-token-xyz')
  })

  test('leaves text with no credential untouched', () => {
    const message = 'apiRequestContext.get: connect ECONNREFUSED ::1:8000'
    expect(redactSecrets(message)).toBe(message)
  })

  test('passes non-string input through unchanged', () => {
    expect(redactSecrets(undefined)).toBeUndefined()
    expect(redactSecrets(null)).toBeNull()
  })
})

test.describe('safeCall', () => {
  test('redacts the Authorization header out of a real Playwright network-failure error', async () => {
    // Real APIRequestContext hitting an unused local port — a genuine
    // ECONNREFUSED with Playwright's own call-log formatting, not a mock.
    const ctx = await request.newContext()
    const secret = 'sk-fixture-safecall-token'

    let thrown = null
    try {
      await safeCall(() => ctx.get('http://127.0.0.1:1/developer/status', {
        headers: { Authorization: `Bearer ${secret}` },
        timeout: 2000,
      }))
    } catch (err) {
      thrown = err
    } finally {
      await ctx.dispose()
    }

    expect(thrown).not.toBeNull()
    expect(thrown.message).toContain(REDACTED)
    expect(thrown.message).not.toContain(secret)
    if (thrown.stack) expect(thrown.stack).not.toContain(secret)
  })

  test('returns the result unchanged on success', async () => {
    const result = await safeCall(async () => 42)
    expect(result).toBe(42)
  })

  test('rethrows a non-Playwright error message unchanged aside from redaction (no-op when nothing to redact)', async () => {
    await expect(safeCall(async () => { throw new Error('plain failure') })).rejects.toThrow('plain failure')
  })
})
