// Redacts credentials from Playwright diagnostic output.
//
// Playwright's APIRequestContext embeds a full "Call log" — including the
// Authorization header — in the .message of any error it throws (e.g. on
// ECONNREFUSED when the backend is down). ember-2#188: this printed the real
// Ember API key into a session transcript and required rotation. The
// diagnostic is worth keeping — it's exactly what tells you the backend is
// unreachable — so the fix is to redact the secret out of it, not remove it.
//
// Every e2e helper that issues a request carrying authHeaders() must route
// that call through safeCall() so a thrown error is redacted before it can
// reach a console.log/warn or the Playwright runner's own failure report.

const REDACTED = '[REDACTED]'

/**
 * Mask credential-bearing substrings in a string. Matches Playwright's
 * call-log format ("- Authorization: Bearer <token>") case-insensitively,
 * plus any bare "Bearer <token>" that isn't already covered by the first
 * pass. Non-string input (e.g. an absent .stack) passes through unchanged.
 */
function redactSecrets(input) {
  if (typeof input !== 'string') return input
  return input
    .replace(/(authorization:\s*)\S+(\s+\S+)?/gi, `$1${REDACTED}`)
    .replace(/(bearer\s+)[A-Za-z0-9._-]+/gi, `$1${REDACTED}`)
}

/**
 * Run an async request call, redacting any credential out of a thrown
 * error's message (and stack, if present) before rethrowing. The call still
 * fails loudly — only the secret is scrubbed, not the diagnostic itself.
 */
async function safeCall(fn) {
  try {
    return await fn()
  } catch (err) {
    if (typeof err?.message === 'string') err.message = redactSecrets(err.message)
    if (typeof err?.stack === 'string') err.stack = redactSecrets(err.stack)
    throw err
  }
}

module.exports = { redactSecrets, safeCall, REDACTED }
