import { describe, it, expect, vi, afterEach } from 'vitest'
import { streamChat } from './ember.js'

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
