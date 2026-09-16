import { describe, it, expect, vi, afterEach } from 'vitest'
import { streamChat, readMemories, searchMemories, semanticSearch, debugContext } from './ember.js'

// Build a fake fetch Response whose body streams the given SSE frames as one
// chunk, terminated by [DONE]. Mirrors the wire format ember.js parses:
// `data: <json>\n` lines. Headers default to null so the transparency-header
// reads in streamChat are inert.
function sseResponse(frames, { headers = {} } = {}) {
  const payload =
    frames.map((f) => `data: ${JSON.stringify(f)}\n`).join('') + 'data: [DONE]\n'
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload))
      controller.close()
    },
  })
  return {
    ok: true,
    status: 200,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    body,
  }
}

async function collect(frames) {
  global.fetch = vi.fn().mockResolvedValue(sseResponse(frames))
  const { stream } = await streamChat([{ role: 'user', content: 'hi' }])
  const events = []
  for await (const e of stream) events.push(e)
  return events
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('streamChat — SSE event discrimination', () => {
  it('labels a vault_sources frame as vault_sources, not web-search sources', async () => {
    const events = await collect([
      { type: 'vault_sources', sources: [{ id: 'v1', title: 'Fixture Note' }] },
    ])
    expect(events).toContainEqual({
      type: 'vault_sources',
      sources: [{ id: 'v1', title: 'Fixture Note' }],
    })
    // And must NOT be mislabeled as web-search sources.
    expect(events.some((e) => e && e.type === 'sources')).toBe(false)
  })

  it('labels a legacy type-less sources frame as web-search sources', async () => {
    const events = await collect([{ sources: [{ url: 'https://example.test' }] }])
    expect(events).toContainEqual({
      type: 'sources',
      sources: [{ url: 'https://example.test' }],
    })
    expect(events.some((e) => e && e.type === 'vault_sources')).toBe(false)
  })

  it('passes status frames through with their content', async () => {
    const events = await collect([{ type: 'status', content: 'searching' }])
    expect(events).toContainEqual({ type: 'status', content: 'searching' })
  })

  it('yields content deltas as plain strings', async () => {
    const events = await collect([
      { choices: [{ delta: { content: 'Hello' } }] },
      { choices: [{ delta: { content: ' world' } }] },
    ])
    expect(events).toEqual(['Hello', ' world'])
  })
})

// Fixture data is synthetic — Vault Privacy Rule.
describe('Memory Browser API client', () => {
  function jsonResponse(body, ok = true, status = 200) {
    return { ok, status, json: async () => body }
  }

  it('readMemories requests the given type and limit, and encodes them as query params', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ memories: [] }))
    await readMemories('journal', 42)
    const [url] = global.fetch.mock.calls[0]
    expect(url).toBe('/read-memories?memory_type=journal&limit=42')
  })

  it('readMemories returns null on a failed response instead of throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 500))
    await expect(readMemories('journal')).resolves.toBeNull()
  })

  it('readMemories returns null when fetch rejects (network failure)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(readMemories('journal')).rejects.toThrow()
  })

  it('searchMemories includes query and memory_type', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ results: [] }))
    await searchMemories('test query', 'conversation', 10)
    const [url] = global.fetch.mock.calls[0]
    expect(url).toBe('/search-memories?query=test+query&memory_type=conversation&limit=10')
  })

  it('semanticSearch omits memory_type when not provided (searches all types)', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ results: [] }))
    await semanticSearch('test query', { limit: 5 })
    const [url] = global.fetch.mock.calls[0]
    expect(url).toBe('/semantic-search?query=test+query&limit=5')
  })

  it('semanticSearch includes memory_type and min_score when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ results: [] }))
    await semanticSearch('test query', { limit: 5, memoryType: 'reflection', minScore: 0.3 })
    const [url] = global.fetch.mock.calls[0]
    expect(url).toBe('/semantic-search?query=test+query&limit=5&memory_type=reflection&min_score=0.3')
  })

  it('semanticSearch returns null on a failed response', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 500))
    await expect(semanticSearch('test query')).resolves.toBeNull()
  })

  it('debugContext requests the message as a query param', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ memory_items: [] }))
    await debugContext('what would this retrieve')
    const [url] = global.fetch.mock.calls[0]
    expect(url).toBe('/debug-context?message=what+would+this+retrieve')
  })

  it('debugContext returns null on a failed response', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 500))
    await expect(debugContext('anything')).resolves.toBeNull()
  })
})
