/**
 * src/api/ember.js
 *
 * Real API client for Ember-2 backend.
 * Connects to /v1/chat/completions (OpenAI-compatible).
 */

const API_URL = import.meta.env.VITE_EMBER_API_URL || 'http://localhost:8000/v1'
const API_KEY = import.meta.env.VITE_EMBER_API_KEY || ''
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || ''

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
export async function streamChat(messages, { sessionId = '', signal } = {}) {
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
      stream: true,
    }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }

  // Web search transparency: read header before consuming the stream
  const usedWebSearch = res.headers.get('x-ember-web-search') === 'true'

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
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }

  return { stream: chunks(), usedWebSearch }
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
    if (!res.ok) return 'unknown'
    const data = await res.json()
    return data.version || 'unknown'
  } catch {
    return 'unknown'
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

export const hasApiKey = !!API_KEY

function authHeaders() {
  return API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}
}

// ---------------------------------------------------------------------------
// Bug reports — GitHub Issues API
// ---------------------------------------------------------------------------

export async function submitBug(title, description) {
  if (!GITHUB_TOKEN) {
    return { ok: false, error: 'No GitHub token configured' }
  }

  try {
    const res = await fetch('https://api.github.com/repos/niansahc/ember-2/issues', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body: description + '\n\n---\n*Submitted from Ember UI*',
        labels: ['bug', 'from-ui'],
      }),
    })

    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const data = await res.json()
    return { ok: true, url: data.html_url, number: data.number }
  } catch (err) {
    return { ok: false, error: err.message }
  }
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
