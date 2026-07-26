/**
 * src/api/mock.js
 *
 * Mock API layer. Returns simulated responses so the UI can be built
 * and tested independently of the real Ember API.
 *
 * There is deliberately NO mock for chat replies or conversation history,
 * and there must never be one again. mockStreamChat and mockGetMessages used
 * to live here and were wired into useChat as an automatic fallback, so any
 * API failure silently produced invented content in Ember's voice: fake
 * journal entries, fake dates, fake web search results, fake conversation
 * transcripts. It fired for something as ordinary as the model server
 * restarting overnight, and the only signal was a console.warn.
 *
 * The mocks that remain are for surfaces where a wrong answer is visibly
 * wrong and carries no claim about the user's own data: an empty sidebar, a
 * model list, an update check, a splash probe. Chat content is different in
 * kind, because the user cannot tell a fabricated reply from a real one.
 *
 * See ADR 0003 before adding anything here that speaks as Ember.
 */

/**
 * Check if the API is reachable. In mock mode, always resolves after a delay.
 */
export async function mockCheckConnection() {
  await sleep(1500)
  return { ok: true, model: 'qwen2.5:14b' }
}

/**
 * Get project list.
 */
export async function mockGetProjects() {
  return [
    { id: 'general', name: 'General', color: '#7a6a5e' },
    { id: 'ember-dev', name: 'Ember Development', color: '#ff8c00' },
    { id: 'work', name: 'Work', color: '#4a9eff' },
    { id: 'personal', name: 'Personal', color: '#8b5cf6' },
  ]
}

/**
 * Get conversation list.
 */
export async function mockGetConversations() {
  return [
    // General (no project) — show in chronological list
    { id: '1', title: 'Weekly planning session', updatedAt: '2026-03-24T10:30:00Z' },
    { id: '2', title: 'Journal reflection — patterns', updatedAt: '2026-03-23T19:15:00Z' },
    { id: '5', title: 'Recipe ideas for the week', updatedAt: '2026-03-20T18:30:00Z' },
    // Project conversations
    { id: '3', title: 'Python streaming question', updatedAt: '2026-03-22T14:45:00Z', projectId: 'ember-dev' },
    { id: '6', title: 'Retrieval eval benchmarks', updatedAt: '2026-03-23T11:00:00Z', projectId: 'ember-dev' },
    { id: '7', title: 'State layer design', updatedAt: '2026-03-21T16:00:00Z', projectId: 'ember-dev' },
    { id: '4', title: 'Work priorities discussion', updatedAt: '2026-03-21T09:00:00Z', projectId: 'work' },
    { id: '8', title: 'Q2 planning notes', updatedAt: '2026-03-20T10:00:00Z', projectId: 'work' },
    { id: '9', title: 'Morning routine check-in', updatedAt: '2026-03-22T08:00:00Z', projectId: 'personal' },
  ]
}

/**
 * Get installed Ollama models.
 */
export async function mockGetOllamaModels() {
  await sleep(400)
  return [
    'qwen2.5:14b',
    'llama3.2:3b',
    'mistral:7b',
    'deepseek-r1:8b',
    'llama3.2-vision:11b',
    'llava:13b',
  ]
}



/**
 * Check for updates against GitHub releases.
 */
export async function mockCheckUpdate() {
  await sleep(600)
  return {
    hasUpdate: false,
    current: 'v0.9.0',
    latest: 'v0.9.0',
    changelog: '',
  }
}

/** Promise-based delay. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
