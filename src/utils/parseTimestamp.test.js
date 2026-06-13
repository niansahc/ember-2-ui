import { describe, it, expect } from 'vitest'
import { parseEmberTimestamp } from './parseTimestamp.js'

// Assertions are timezone-safe: the hyphenated vault form has no zone suffix,
// so it parses as LOCAL time. We compare against a Date built the same way in
// the same runtime (new Date(y, m, d, h, ...)) rather than asserting an
// absolute epoch, which would shift across machines.

describe('parseEmberTimestamp', () => {
  it('parses the hyphenated vault time form into a valid Date', () => {
    const d = parseEmberTimestamp('2026-03-31T14-30-00')
    expect(d).toBeInstanceOf(Date)
    // Local-time fields, since the string carries no zone.
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2) // March is 0-indexed 2
    expect(d.getDate()).toBe(31)
    expect(d.getHours()).toBe(14)
    expect(d.getMinutes()).toBe(30)
    expect(d.getSeconds()).toBe(0)
  })

  it('strips a microsecond suffix and still parses', () => {
    const d = parseEmberTimestamp('2026-03-31T14-30-00-123456')
    expect(d).toBeInstanceOf(Date)
    expect(d.getHours()).toBe(14)
    expect(d.getMinutes()).toBe(30)
    expect(d.getSeconds()).toBe(0)
  })

  it('matches an equivalent local Date for the hyphenated form', () => {
    const d = parseEmberTimestamp('2026-03-31T14-30-00')
    const expected = new Date(2026, 2, 31, 14, 30, 0)
    expect(d.getTime()).toBe(expected.getTime())
  })

  it('parses a standard ISO timestamp with a zone offset', () => {
    const d = parseEmberTimestamp('2026-03-24T10:30:00Z')
    expect(d).toBeInstanceOf(Date)
    // Z is absolute UTC — assert via UTC accessors to stay TZ-independent.
    expect(d.getTime()).toBe(Date.UTC(2026, 2, 24, 10, 30, 0))
  })

  it('returns null for an unparseable string', () => {
    expect(parseEmberTimestamp('not-a-timestamp')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseEmberTimestamp('')).toBeNull()
  })

  it('returns null for null/undefined input', () => {
    expect(parseEmberTimestamp(null)).toBeNull()
    expect(parseEmberTimestamp(undefined)).toBeNull()
  })
})
