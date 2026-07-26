import { describe, it, expect } from 'vitest'
import {
  chatErrorMessage,
  providerForModel,
  LOCAL_RUNTIME_NAME,
  CONVERSATION_LOAD_ERROR,
} from './chatError.js'

// The point of these tests is not that the strings are spelled a particular
// way. It is that every failure the user can hit produces a message naming
// the right provider and a concrete next step, and that nothing anywhere in
// here ever answers the user's actual question. See ADR 0003.

describe('providerForModel', () => {
  it('routes claude- prefixed models to Anthropic', () => {
    expect(providerForModel('claude-haiku-4-5-20251001')).toMatchObject({
      id: 'anthropic',
      name: 'Anthropic',
      isCloud: true,
    })
  })

  it('routes gpt- prefixed models to OpenAI', () => {
    expect(providerForModel('gpt-4o')).toMatchObject({
      id: 'openai',
      name: 'OpenAI',
      isCloud: true,
    })
  })

  it('treats anything else as the local runtime', () => {
    expect(providerForModel('qwen3:8b')).toMatchObject({
      id: 'local',
      name: LOCAL_RUNTIME_NAME,
      isCloud: false,
    })
  })

  it('reports unknown for a null model id rather than guessing local', () => {
    // App holds the model from the Splash handshake, so a failure early in the
    // session genuinely has nothing to report. Guessing "local" here would
    // tell a cloud user to start Ollama.
    expect(providerForModel(null)).toMatchObject({ id: 'unknown', name: null, isCloud: false })
  })
})

describe('chatErrorMessage — unreachable', () => {
  it('points at the backend process, not the model provider', () => {
    // Nothing answered, so naming Ollama or Anthropic here would send the
    // user to check something that was never involved.
    const msg = chatErrorMessage({ kind: 'unreachable' }, 'qwen3:8b')
    expect(msg).toContain('Ember-2')
    expect(msg).not.toContain(LOCAL_RUNTIME_NAME)
    expect(msg).not.toContain('Anthropic')
  })

  it('says the same thing regardless of provider', () => {
    const local = chatErrorMessage({ kind: 'unreachable' }, 'qwen3:8b')
    const cloud = chatErrorMessage({ kind: 'unreachable' }, 'claude-haiku-4-5-20251001')
    expect(local).toBe(cloud)
  })
})

describe('chatErrorMessage — generation_failed', () => {
  // This is the incident case: backend up, /api/health green, model dead.
  it('names the local runtime when the model is local', () => {
    const msg = chatErrorMessage({ kind: 'generation_failed', status: 500 }, 'qwen3:8b')
    expect(msg).toContain(LOCAL_RUNTIME_NAME)
    expect(msg).toContain('My backend is up')
  })

  it('names Anthropic for a claude model and never mentions Ollama', () => {
    const msg = chatErrorMessage({ kind: 'generation_failed', status: 500 }, 'claude-haiku-4-5-20251001')
    expect(msg).toContain('Anthropic')
    expect(msg).not.toContain(LOCAL_RUNTIME_NAME)
  })

  it('names OpenAI for a gpt model and never mentions Ollama', () => {
    const msg = chatErrorMessage({ kind: 'generation_failed', status: 500 }, 'gpt-4o')
    expect(msg).toContain('OpenAI')
    expect(msg).not.toContain(LOCAL_RUNTIME_NAME)
  })

  it('stays provider-neutral when the model is unknown', () => {
    const msg = chatErrorMessage({ kind: 'generation_failed', status: 500 }, null)
    expect(msg).not.toContain(LOCAL_RUNTIME_NAME)
    expect(msg).not.toContain('Anthropic')
    expect(msg).not.toContain('OpenAI')
    expect(msg).toContain('model service')
  })
})

describe('chatErrorMessage — unauthorized and rate_limited', () => {
  it('points at the API key on 401/403', () => {
    const msg = chatErrorMessage({ kind: 'unauthorized', status: 401 }, 'qwen3:8b')
    expect(msg).toContain('API key')
  })

  it('names the cloud provider doing the throttling', () => {
    const msg = chatErrorMessage({ kind: 'rate_limited', status: 429 }, 'gpt-4o')
    expect(msg).toContain('OpenAI')
    expect(msg).toContain('minute')
  })

  it('stays generic when a local model is throttled', () => {
    const msg = chatErrorMessage({ kind: 'rate_limited', status: 429 }, 'qwen3:8b')
    expect(msg).toContain('throttling')
    expect(msg).not.toContain('OpenAI')
  })
})

describe('chatErrorMessage — unknown', () => {
  it('includes the status code when there is one', () => {
    expect(chatErrorMessage({ kind: 'unknown', status: 418 }, 'qwen3:8b')).toContain('HTTP 418')
  })

  it('omits the status code rather than printing null', () => {
    const msg = chatErrorMessage({ kind: 'unknown', status: null }, 'qwen3:8b')
    expect(msg).not.toContain('null')
    expect(msg).not.toContain('HTTP')
  })

  it('falls back to unknown for a thrown value that is not an EmberApiError', () => {
    // A TypeError from somewhere unexpected still has to produce something
    // honest rather than crashing the error path itself.
    expect(chatErrorMessage(new TypeError('boom'), 'qwen3:8b')).toContain('Something went wrong')
    expect(chatErrorMessage(undefined, null)).toContain('Something went wrong')
  })
})

describe('no fabrication', () => {
  // The regression guard for the actual bug. Every message must read as a
  // status report about the system, never as an answer to whatever the user
  // asked, and must never claim to know anything about their vault.
  const ALL = [
    chatErrorMessage({ kind: 'unreachable' }, 'qwen3:8b'),
    chatErrorMessage({ kind: 'generation_failed', status: 500 }, 'qwen3:8b'),
    chatErrorMessage({ kind: 'generation_failed', status: 500 }, 'claude-haiku-4-5-20251001'),
    chatErrorMessage({ kind: 'unauthorized', status: 401 }, 'qwen3:8b'),
    chatErrorMessage({ kind: 'rate_limited', status: 429 }, 'gpt-4o'),
    chatErrorMessage({ kind: 'unknown', status: 503 }, 'qwen3:8b'),
    CONVERSATION_LOAD_ERROR,
  ]

  it('never claims to recall anything from the vault', () => {
    for (const msg of ALL) {
      expect(msg).not.toMatch(/journal|you wrote|I remember|last time|recent entries/i)
    }
  })

  it('never presents itself as an answer', () => {
    for (const msg of ALL) {
      expect(msg).not.toMatch(/here'?s what I found|based on your|I've been thinking/i)
    }
  })

  it('every message names the system, so it cannot be mistaken for a reply', () => {
    for (const msg of ALL) {
      expect(msg).toMatch(/backend|API key|throttling|rate limiting/i)
    }
  })
})
