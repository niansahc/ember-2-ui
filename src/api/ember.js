/**
 * src/api/ember.js
 *
 * Real API client for Ember-2 backend.
 * Connects to /v1/chat/completions (OpenAI-compatible).
 */

const API_URL = import.meta.env.VITE_EMBER_API_URL || 'http://localhost:8000/v1'
const API_KEY = window.__EMBER_API_KEY__ || import.meta.env.VITE_EMBER_API_KEY || ''

if (!API_KEY) {
  console.warn(
    '[ember.js] VITE_EMBER_API_KEY is not set. Authenticated API calls will fail.\n' +
    'Add it to .env: VITE_EMBER_API_KEY=your_key\n' +
    'Get your key from: python scripts/set_api_key.py (in the ember-2 repo)',
  )
}

// ---------------------------------------------------------------------------
// Chat — streaming SSE
// ---------------------------------------------------------------------------

/**
 * Stream a chat response from the Ember API.
 * Yields text chunks as they arrive.
 */
export async function streamChat(messages, { sessionId = '', signal, bareMode, vaultEnabled } = {}) {
  const body = { model: 'ember', messages, stream: true }
  if (bareMode != null) body.bare_mode = bareMode
  if (vaultEnabled != null) body.vault_enabled = vaultEnabled

  const res = await fetch(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(sessionId && { 'X-Session-ID': sessionId }),
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }

  // Transparency headers: read before consuming the stream so the UI can
  // show indicators for web search and vault-grounded responses.
  const usedWebSearch = res.headers.get('x-ember-web-search') === 'true'
  const usedVault = res.headers.get('x-ember-vault-used') === 'true'
  const usedVision = res.headers.get('x-ember-vision-used') === 'true'

  async function* chunks() {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)

          // Status events: searching, verifying, refining
          if (parsed.type === 'status') {
            yield { type: 'status', content: parsed.content }
            continue
          }

          // Sources event: inline citations from web search
          if (parsed.sources) {
            yield { type: 'sources', sources: parsed.sources }
            continue
          }

          // Vault sources event: citations from vault-grounded responses
          // G ships this as { type: 'vault_sources', sources: [...] }
          if (parsed.type === 'vault_sources' && parsed.sources) {
            yield { type: 'vault_sources', sources: parsed.sources }
            continue
          }

          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }

  return { stream: chunks(), usedWebSearch, usedVault, usedVision }
}

// ---------------------------------------------------------------------------
// Connection check
// ---------------------------------------------------------------------------

export async function getVersion() {
  try {
    const res = await fetch('/api/health', {
      headers: authHeaders(),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    const v = data.version || ''
    // Filter out placeholder values from backend
    if (!v || v === 'unknown' || v === 'vunknown') return ''
    return v
  } catch {
    return ''
  }
}

export async function checkConnection() {
  try {
    const res = await fetch('/api/health', {
      headers: authHeaders(),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { ok: false }
    const data = await res.json().catch(() => ({}))
    return { ok: true, model: data.model || 'unknown' }
  } catch {
    return { ok: false }
  }
}

// ---------------------------------------------------------------------------
// Service health (ServiceStatus indicator)
// ---------------------------------------------------------------------------

/**
 * Poll service health for the status indicator. Reads the existing
 * /api/health endpoint — G is adding a `docker` field alongside the
 * existing `status` and `model` fields. Until shipped, the UI treats
 * a missing `docker` field as "unknown".
 *
 * Returns { api: "ok"|"down", docker: "ok"|"down"|"unknown" }
 */
export async function getServiceHealth() {
  try {
    const res = await fetch('/api/health', {
      headers: authHeaders(),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { api: 'down', docker: 'unknown' }
    const data = await res.json().catch(() => ({}))
    return {
      api: 'ok',
      docker: data.docker || 'unknown',
    }
  } catch {
    return { api: 'down', docker: 'unknown' }
  }
}

/**
 * Restart a named service. G is building POST /v1/service/{name}/restart.
 * Mocked in Playwright via page.route() until shipped.
 */
export async function restartService(name) {
  const res = await fetch(`${API_URL}/service/${encodeURIComponent(name)}/restart`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Restart failed (${res.status})`)
  }
  return await res.json()
}

/**
 * Shut down the API server. G is building POST /v1/service/shutdown.
 * After this call the backend stops — the dots will go dark on next poll.
 */
export async function shutdownService() {
  const res = await fetch(`${API_URL}/service/shutdown`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Shutdown failed (${res.status})`)
  }
  return await res.json()
}

// ---------------------------------------------------------------------------
// Model info
// ---------------------------------------------------------------------------

export async function getModel() {
  try {
    const res = await fetch('/model', { headers: authHeaders() })
    return await res.json()
  } catch {
    return { model: 'unknown' }
  }
}

export async function setModel(model) {
  try {
    const res = await fetch('/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ model }),
    })
    return await res.json()
  } catch {
    return { ok: false }
  }
}

// ---------------------------------------------------------------------------
// Cloud provider keys
// ---------------------------------------------------------------------------

export async function getProviderKey(provider) {
  try {
    const res = await fetch(`/provider-key/${provider}`, { headers: authHeaders() })
    if (!res.ok) return { configured: false }
    return await res.json()
  } catch {
    return { configured: false }
  }
}

export async function setProviderKey(provider, apiKey) {
  const res = await fetch('/provider-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ provider, api_key: apiKey }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function deleteProviderKey(provider) {
  const res = await fetch(`/provider-key/${provider}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return await res.json()
}

// ---------------------------------------------------------------------------
// Conversations — session CRUD
// ---------------------------------------------------------------------------

export async function getConversations(limit = 50) {
  const res = await fetch(`${API_URL}/conversations?limit=${limit}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  return data.conversations || []
}

export async function getConversation(sessionId) {
  const res = await fetch(`${API_URL}/conversations/${sessionId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function getConversationTurns(sessionId) {
  const res = await fetch(`${API_URL}/conversations/${sessionId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  return data.turns || []
}

export async function renameConversation(sessionId, title) {
  const res = await fetch(`${API_URL}/conversations/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function deleteConversation(sessionId) {
  const res = await fetch(`${API_URL}/conversations/${sessionId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

// ---------------------------------------------------------------------------
// Projects — CRUD
// ---------------------------------------------------------------------------

export async function getProjects() {
  const res = await fetch(`${API_URL}/projects`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  return data.projects || []
}

export async function createProject(name, color = '#ff8c00') {
  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, color }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function renameProject(projectId, name) {
  const res = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function deleteProject(projectId) {
  const res = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function getProjectConversations(projectId, limit = 50) {
  const res = await fetch(`${API_URL}/projects/${projectId}/conversations?limit=${limit}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  return data.conversations || []
}

export async function moveConversationToProject(conversationId, projectId) {
  const res = await fetch(`${API_URL}/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ project_id: projectId }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

// ---------------------------------------------------------------------------
// Security / PIN
// ---------------------------------------------------------------------------

export async function getPinStatus() {
  try {
    const res = await fetch(`${API_URL}/security/pin/status`)
    if (!res.ok) return { pin_set: false }
    return await res.json()
  } catch {
    return { pin_set: false }
  }
}

export async function setPin(pin, recoveryPassphrase) {
  const res = await fetch(`${API_URL}/security/pin/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ pin, recovery_passphrase: recoveryPassphrase }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Error ${res.status}`)
  }
  return await res.json()
}

export async function verifyPin(pin) {
  const res = await fetch(`${API_URL}/security/pin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  })
  if (res.status === 429) return { valid: false, locked: true }
  if (!res.ok) return { valid: false }
  return await res.json()
}

export async function recoverPin(recoveryPassphrase, newPin) {
  const res = await fetch(`${API_URL}/security/pin/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recovery_passphrase: recoveryPassphrase, new_pin: newPin }),
  })
  if (res.status === 429) throw new Error('Too many attempts. Try again in 5 minutes.')
  if (res.status === 403) throw new Error('Invalid recovery passphrase')
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return await res.json()
}

/**
 * Get disk encryption status for the host device.
 * Backend endpoint GET /v1/system/disk-encryption is in flight with G.
 * Contract: { enabled: bool, platform: "windows"|"darwin"|"linux"|"unknown",
 *             method: "bitlocker"|"filevault"|"luks"|null }.
 * Returns { ok: false } on network/parse error so Settings can show the
 * error copy without throwing.
 */
export async function getDiskEncryption() {
  try {
    const res = await fetch(`${API_URL}/system/disk-encryption`, {
      headers: { ...authHeaders() },
    })
    if (!res.ok) return { ok: false }
    const data = await res.json()
    return { ok: true, ...data }
  } catch {
    return { ok: false }
  }
}

/**
 * Change an existing PIN. Requires the current PIN for re-auth.
 * Backend endpoint POST /v1/security/pin/change is implemented by G — wired
 * behind the same rate limiter as /pin/verify. Until that ships, Playwright
 * intercepts this route via page.route() to mock the response.
 */
export async function changePin(currentPin, newPin) {
  const res = await fetch(`${API_URL}/security/pin/change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
  })
  if (res.status === 429) throw new Error('Too many attempts. Try again in 5 minutes.')
  if (res.status === 403) throw new Error('Current PIN is incorrect')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Error ${res.status}`)
  }
  return await res.json()
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function getTasks({ status } = {}) {
  try {
    const params = status ? `?status=${status}` : ''
    const res = await fetch(`${API_URL}/tasks${params}`, { headers: authHeaders() })
    if (!res.ok) return []
    const data = await res.json()
    return data.tasks || []
  } catch {
    return []
  }
}

export async function updateTaskStatus(taskId, status) {
  const res = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function deleteTask(taskId) {
  const res = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getPreferences() {
  try {
    const res = await fetch(`${API_URL}/preferences`, { headers: authHeaders() })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

export async function updatePreferences(updates) {
  try {
    const res = await fetch(`${API_URL}/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(updates),
    })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// File upload
// ---------------------------------------------------------------------------

/**
 * Upload a document for ingestion into the vault.
 * Returns { status, filename, chunks } for documents.
 */
export async function uploadDocument(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/ingest/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Upload failed ${res.status}: ${text}`)
  }
  return await res.json()
}

/**
 * Send a chat message (non-streaming) with session tracking.
 */
export async function sendChat(messages, { sessionId } = {}) {
  const res = await fetch(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(sessionId && { 'X-Session-ID': sessionId }),
    },
    body: JSON.stringify({
      model: 'ember',
      messages,
      stream: false,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ---------------------------------------------------------------------------
// Memory / State writes (used by onboarding)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Lodestone
// ---------------------------------------------------------------------------

export async function createLodestone(value, taxonomyCategory, source = 'onboarding') {
  const res = await fetch(`${API_URL}/lodestone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ value, taxonomy_category: taxonomyCategory, source }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function updateLodestone(recordId, updates) {
  const res = await fetch(`${API_URL}/lodestone/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `API error ${res.status}`)
  }
  return await res.json()
}

export async function getLodestone() {
  const res = await fetch(`${API_URL}/lodestone`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function writeMemory(text, memoryType = 'profile') {
  const res = await fetch('/write-memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text, memory_type: memoryType }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

export async function writeState(type, text, { source = 'ui', tags = [], metadata = {} } = {}) {
  const res = await fetch('/write-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ type, text, source, tags, metadata }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

// ---------------------------------------------------------------------------
// Developer vault switcher (dev mode only)
// ---------------------------------------------------------------------------

/**
 * Check whether dev mode is active and which vault is loaded.
 * G is building GET /v1/developer/status.
 * Returns { dev_mode, active_vault: { label, path }, available_vaults }.
 */
export async function getDeveloperStatus() {
  try {
    const res = await fetch(`${API_URL}/developer/status`, { headers: authHeaders() })
    if (!res.ok) return { dev_mode: false }
    return await res.json()
  } catch {
    return { dev_mode: false }
  }
}

/**
 * Swap to a different vault. G is building POST /v1/developer/vault/swap.
 */
export async function swapVault(vaultLabel) {
  const res = await fetch(`${API_URL}/developer/vault/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ vault_label: vaultLabel }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Swap failed (${res.status})`)
  }
  return await res.json()
}

/**
 * Launch the Ember installer on the user's machine.
 */
export async function launchInstaller() {
  const res = await fetch(`${API_URL}/launch-installer`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Launch failed (${res.status})`)
  }
  return await res.json()
}

/**
 * Get vault storage stats -- current size and 30-day projection.
 */
export async function getVaultStorage() {
  const res = await fetch(`${API_URL}/vault/storage`, {
    headers: authHeaders(),
  })
  if (!res.ok) return null
  return await res.json()
}

export const hasApiKey = !!API_KEY

function authHeaders() {
  return API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}
}


// ---------------------------------------------------------------------------
// Updates — GitHub Releases API
// ---------------------------------------------------------------------------

export async function checkUpdate(currentVersion) {
  try {
    const res = await fetch(
      'https://api.github.com/repos/niansahc/ember-2/releases/latest',
      { headers: { Accept: 'application/vnd.github+json' } },
    )
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const data = await res.json()

    return {
      hasUpdate: data.tag_name !== currentVersion,
      current: currentVersion,
      latest: data.tag_name,
      changelog: data.body || '',
      publishedAt: data.published_at,
    }
  } catch {
    return { error: true }
  }
}
