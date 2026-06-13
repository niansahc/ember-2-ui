import { describe, it, expect } from 'vitest'
import { uuid } from './uuid.js'

// RFC 4122 v4: version nibble fixed at 4, variant nibble in [8,9,a,b].
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('uuid', () => {
  it('produces a v4-formatted UUID', () => {
    expect(uuid()).toMatch(V4)
  })

  it('every value across many calls is v4-formatted', () => {
    for (let i = 0; i < 1000; i++) {
      expect(uuid()).toMatch(V4)
    }
  })

  it('generates unique values across many calls', () => {
    const seen = new Set()
    const N = 5000
    for (let i = 0; i < N; i++) {
      seen.add(uuid())
    }
    expect(seen.size).toBe(N)
  })
})
