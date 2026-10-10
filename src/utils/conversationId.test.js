import { describe, it, expect } from 'vitest'
import { isValidConversationId } from './conversationId.js'

describe('isValidConversationId', () => {
  // Positive control: the absence assertions below only mean something if a
  // good id passes.
  it('accepts backend-shaped and synthetic ids', () => {
    expect(isValidConversationId('sess_0123456789abcdef')).toBe(true)
    expect(isValidConversationId('sess_badturn01')).toBe(true)
    expect(isValidConversationId('conv-1')).toBe(true)
    expect(isValidConversationId('1')).toBe(true)
  })

  it('rejects non-strings, including the boolean that caused the incident', () => {
    for (const bad of [false, true, null, undefined, 0, 1, {}, [], ['sess_a']]) {
      expect(isValidConversationId(bad)).toBe(false)
    }
  })

  it('rejects the stringified forms of non-ids left behind in localStorage', () => {
    for (const bad of ['false', 'true', 'null', 'undefined', 'NaN', 'False']) {
      expect(isValidConversationId(bad)).toBe(false)
    }
  })

  it('rejects empty, padded, and path-shaped strings', () => {
    for (const bad of ['', ' ', 'false ', ' sess_a', '../x', 'a/b', 'a?b=1', 'a#b', 'a b', 'a.b']) {
      expect(isValidConversationId(bad)).toBe(false)
    }
  })
})
