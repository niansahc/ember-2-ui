// skipIfBackendDown — graceful skip when the Ember backend is unreachable.
//
// Why this exists: tests that depend on the FastAPI backend (either because
// they run against the built UI on :8000, or because they call /v1/* APIs
// directly) used to fail with cryptic net::ERR_ABORTED errors when the
// backend was offline. This helper turns that into a clean test.skip() with
// an actionable reason, so a stopped backend during local dev doesn't look
// like a real test regression.
//
// Implementation note: we use a raw TCP connect rather than `fetch()`.
// On Windows + Node 24, undici's first HTTP request from a Playwright
// worker frequently takes 3–8s for connection establishment even when warm
// requests complete in <50ms; the resulting flaky timeouts caused the
// helper itself to false-positive. A TCP socket open is sub-millisecond
// when the port is listening and fails fast (ECONNREFUSED) when it is not,
// which is exactly the signal we need: "is the API process running?".
//
// Usage from a spec:
//   const { skipIfBackendDown } = require('./helpers/skip-if-backend-down.cjs')
//
//   test.beforeEach(async () => {
//     await skipIfBackendDown(test)
//     // ... rest of beforeEach (mockBootstrap, page.goto, etc.)
//   })
//
// Or at the top of a single test:
//   test('my test', async ({ page }) => {
//     await skipIfBackendDown(test)
//     // ... test body
//   })
//
// Defaults to 127.0.0.1:8000 with a 1.5s connect timeout. Override either
// with the optional second argument:
//   await skipIfBackendDown(test, { host: '127.0.0.1', port: 8000, timeoutMs: 500 })

const net = require('net')

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 8000
const DEFAULT_TIMEOUT_MS = 1500

function probeBackend(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false
    const finish = (reachable, detail) => {
      if (settled) return
      settled = true
      try { socket.destroy() } catch {}
      resolve({ reachable, detail })
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true, ''))
    socket.once('timeout', () => finish(false, `connect timed out after ${timeoutMs}ms`))
    socket.once('error', (err) => finish(false, err && err.code ? err.code : (err?.message || 'unknown')))
    socket.connect(port, host)
  })
}

async function skipIfBackendDown(testInstance, opts = {}) {
  const host = opts.host || DEFAULT_HOST
  const port = opts.port || DEFAULT_PORT
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS

  const { reachable, detail } = await probeBackend(host, port, timeoutMs)
  if (!reachable) {
    testInstance.skip(true, `Backend unreachable at ${host}:${port} (${detail || 'unknown error'}) — skipping backend-dependent test`)
  }
}

module.exports = { skipIfBackendDown }
