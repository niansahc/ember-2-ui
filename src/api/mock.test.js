import { describe, it, expect } from 'vitest'
import * as mock from './mock.js'

// The mockStreamChat suite that used to live here is gone with the function
// itself. It asserted, in detail, that the UI would faithfully reproduce
// invented journal entries and invented web search results word by word. The
// test was correct about the behavior and the behavior was the bug. See
// ADR 0003.

describe('mock module surface', () => {
  // A guard, not a formality. The chat fabrication path was removed because a
  // failed API call must never turn into content the user could mistake for
  // Ember. Re-exporting either of these would quietly restore that, so the
  // absence is asserted rather than assumed.
  it('exports no chat reply or conversation history mock', () => {
    expect(mock.mockStreamChat).toBeUndefined()
    expect(mock.mockGetMessages).toBeUndefined()
  })

  it('still exports the surfaces where a mock is harmless', () => {
    // These describe app chrome, not the user's own data, and a wrong answer
    // from any of them is visibly wrong rather than quietly plausible.
    expect(typeof mock.mockCheckConnection).toBe('function')
    expect(typeof mock.mockGetProjects).toBe('function')
    expect(typeof mock.mockGetConversations).toBe('function')
    expect(typeof mock.mockGetOllamaModels).toBe('function')
    expect(typeof mock.mockCheckUpdate).toBe('function')
  })
})

describe('mockGetProjects', () => {
  it('returns the fixed project list', async () => {
    const projects = await mock.mockGetProjects()
    expect(projects).toEqual([
      { id: 'general', name: 'General', color: '#7a6a5e' },
      { id: 'ember-dev', name: 'Ember Development', color: '#ff8c00' },
      { id: 'work', name: 'Work', color: '#4a9eff' },
      { id: 'personal', name: 'Personal', color: '#8b5cf6' },
    ])
  })
})
