// Testvault helpers for Playwright e2e tests.
//
// Tests that hit the real backend (no mockBootstrap) MUST run against the
// dedicated 'test' vault, never the user's personal vault. Each test that
// writes data should snapshot vault state at the start and clean up
// anything new at the end.
//
// Usage:
//   const { assertTestVault, snapshotVault, cleanupSinceSnapshot } = require('./helpers/testvault.cjs')
//
//   test.beforeEach(async ({ page, request }) => {
//     await assertTestVault(request)
//     const snapshot = await snapshotVault(request)
//     // ... run test ...
//     await cleanupSinceSnapshot(request, snapshot)
//   })
//
// The backend must be switched to the 'test' vault manually before running
// these tests (POST /v1/developer/vault/swap body {"vault_label": "test"}).
// There is currently no API to swap back to the default vault -- an API
// restart is required. This is a known backend gap flagged for G.

const API_URL = 'http://localhost:8000/v1'

function getApiKey() {
  // Key is injected via window.__EMBER_API_KEY__ on production builds.
  // For the Playwright request context we read from the .env file path.
  const fs = require('fs')
  const path = require('path')
  const envPath = path.resolve(__dirname, '..', '..', '..', '.env')
  try {
    const content = fs.readFileSync(envPath, 'utf8')
    const match = content.match(/VITE_EMBER_API_KEY=(.+)/)
    if (match) return match[1].trim()
  } catch {}
  return ''
}

function authHeaders() {
  const key = getApiKey()
  return key ? { Authorization: `Bearer ${key}` } : {}
}

/**
 * Fail fast if the backend is not pointed at the 'test' vault.
 * Prevents accidental writes to the user's personal vault.
 */
async function assertTestVault(request) {
  const res = await request.get(`${API_URL}/developer/status`, {
    headers: authHeaders(),
  })
  if (!res.ok()) {
    throw new Error(
      `Cannot verify vault state: /v1/developer/status returned ${res.status()}. ` +
      `Ensure the backend is running and dev mode is enabled.`,
    )
  }
  const data = await res.json()
  const label = data?.active_vault?.label
  if (label !== 'test') {
    throw new Error(
      `Tests must run against the 'test' vault. Current vault: '${label}'. ` +
      `Swap with: curl -X POST http://localhost:8000/v1/developer/vault/swap ` +
      `-H "Authorization: Bearer <key>" -H "Content-Type: application/json" ` +
      `-d '{"vault_label": "test"}'`,
    )
  }
  return data
}

/**
 * Capture current IDs for conversations and tasks so we can detect and
 * delete anything new after the test runs.
 */
async function snapshotVault(request) {
  const [convRes, taskActiveRes, taskProposedRes, projRes] = await Promise.all([
    request.get(`${API_URL}/conversations?limit=500`, { headers: authHeaders() }),
    request.get(`${API_URL}/tasks?status=active`, { headers: authHeaders() }),
    request.get(`${API_URL}/tasks?status=proposed`, { headers: authHeaders() }),
    request.get(`${API_URL}/projects`, { headers: authHeaders() }),
  ])

  const conversations = convRes.ok() ? (await convRes.json()) : []
  const convList = Array.isArray(conversations) ? conversations : (conversations.conversations || [])
  const convIds = new Set(convList.map((c) => c.session_id || c.id).filter(Boolean))

  const taskActive = taskActiveRes.ok() ? (await taskActiveRes.json()) : []
  const taskProposed = taskProposedRes.ok() ? (await taskProposedRes.json()) : []
  const taskList = [...(Array.isArray(taskActive) ? taskActive : []), ...(Array.isArray(taskProposed) ? taskProposed : [])]
  const taskIds = new Set(taskList.map((t) => t.id).filter(Boolean))

  const projects = projRes.ok() ? (await projRes.json()) : []
  const projList = Array.isArray(projects) ? projects : (projects.projects || [])
  const projIds = new Set(projList.map((p) => p.id).filter(Boolean))

  return { conversations: convIds, tasks: taskIds, projects: projIds }
}

/**
 * Delete anything that appeared after the snapshot was taken.
 * Best-effort: logs failures but does not throw, so a cleanup error
 * doesn't mask the actual test result.
 */
async function cleanupSinceSnapshot(request, snapshot) {
  const failures = []

  // conversations
  try {
    const res = await request.get(`${API_URL}/conversations?limit=500`, { headers: authHeaders() })
    if (res.ok()) {
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.conversations || [])
      for (const c of list) {
        const id = c.session_id || c.id
        if (id && !snapshot.conversations.has(id)) {
          const del = await request.delete(`${API_URL}/conversations/${id}`, { headers: authHeaders() })
          if (!del.ok()) failures.push(`conversation ${id}: ${del.status()}`)
        }
      }
    }
  } catch (e) {
    failures.push(`conversation cleanup error: ${e.message}`)
  }

  // tasks
  try {
    for (const status of ['active', 'proposed']) {
      const res = await request.get(`${API_URL}/tasks?status=${status}`, { headers: authHeaders() })
      if (!res.ok()) continue
      const list = await res.json()
      if (!Array.isArray(list)) continue
      for (const t of list) {
        if (t.id && !snapshot.tasks.has(t.id)) {
          const del = await request.delete(`${API_URL}/tasks/${t.id}`, { headers: authHeaders() })
          if (!del.ok()) failures.push(`task ${t.id}: ${del.status()}`)
        }
      }
    }
  } catch (e) {
    failures.push(`task cleanup error: ${e.message}`)
  }

  // projects
  try {
    const res = await request.get(`${API_URL}/projects`, { headers: authHeaders() })
    if (res.ok()) {
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.projects || [])
      for (const p of list) {
        if (p.id && !snapshot.projects.has(p.id)) {
          const del = await request.delete(`${API_URL}/projects/${p.id}`, { headers: authHeaders() })
          if (!del.ok()) failures.push(`project ${p.id}: ${del.status()}`)
        }
      }
    }
  } catch (e) {
    failures.push(`project cleanup error: ${e.message}`)
  }

  if (failures.length > 0) {
    console.warn('[testvault cleanup] partial cleanup:', failures.join(', '))
  }
}

module.exports = { assertTestVault, snapshotVault, cleanupSinceSnapshot, API_URL, authHeaders }
