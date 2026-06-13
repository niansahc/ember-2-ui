import { describe, it, expect } from 'vitest'
import { extractFirstName, getGreeting } from './greeting.js'

// Ported from tests/e2e/greeting.spec.cjs (the page.evaluate module block).
// Those cases needed the Vite dev server to serve the ESM module; here they
// run node-only, no browser, no skip gate.

describe('extractFirstName — common identity forms', () => {
  it('takes the first token before a comma', () => {
    expect(extractFirstName('Alex, they/them')).toBe('Alex')
  })

  it('handles "My name is X"', () => {
    expect(extractFirstName('My name is Alex')).toBe('Alex')
  })

  it("handles \"I'm X (pronouns)\"", () => {
    expect(extractFirstName("I'm Alex (she/her)")).toBe('Alex')
  })

  it('handles "I am X"', () => {
    expect(extractFirstName('I am Alex')).toBe('Alex')
  })

  it('handles "call me X"', () => {
    expect(extractFirstName('call me Alex')).toBe('Alex')
  })

  it('capitalizes a bare lowercase name', () => {
    expect(extractFirstName('alex')).toBe('Alex')
  })

  it('normalizes a bare uppercase name', () => {
    expect(extractFirstName('ALEX')).toBe('Alex')
  })

  it('returns null for an empty string', () => {
    expect(extractFirstName('')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(extractFirstName(null)).toBeNull()
  })

  it('returns null for a non-string input', () => {
    expect(extractFirstName(42)).toBeNull()
  })
})

describe('getGreeting — time bucket classification', () => {
  // rng pinned to 0 so the name branch never fires; we only check the bucket.
  const at = (hour) =>
    getGreeting({ name: null, now: new Date(2026, 0, 1, hour, 0, 0), rng: () => 0 }).bucket

  it.each([
    [0, 'late_night'],
    [4, 'late_night'],
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [21, 'evening'],
    [22, 'night'],
    [23, 'night'],
  ])('hour %i falls into bucket %s', (hour, bucket) => {
    expect(at(hour)).toBe(bucket)
  })
})

describe('getGreeting — RNG determinism', () => {
  it('is deterministic for a fixed rng and date', () => {
    // rng() < 0.4 triggers the name branch; 0.5 skips it, so output depends
    // only on the date and the (constant) pick index.
    const opts = { name: 'Alex', now: new Date(2026, 0, 1, 10, 0, 0), rng: () => 0.5 }
    const first = getGreeting(opts)
    const second = getGreeting(opts)

    expect(first.bucket).toBe('morning')
    expect(second).toEqual(first)
    // rng > 0.4 skipped the name branch, so the name never appears in the title.
    expect(first.title).not.toContain('Alex')
  })

  it('inserts the name when rng falls under the 0.4 threshold', () => {
    const { title } = getGreeting({
      name: 'Alex',
      now: new Date(2026, 0, 1, 10, 0, 0),
      rng: () => 0,
    })
    expect(title).toContain('Alex')
  })
})
