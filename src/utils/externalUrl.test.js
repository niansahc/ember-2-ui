import { describe, it, expect } from 'vitest'
import { safeExternalUrl } from './externalUrl.js'

describe('safeExternalUrl', () => {
  // Positive control for the rejections below.
  it('passes absolute http and https URLs', () => {
    expect(safeExternalUrl('https://example.test/a')).toBe('https://example.test/a')
    expect(safeExternalUrl('http://example.test/')).toBe('http://example.test/')
    expect(safeExternalUrl('  https://example.test/a  ')).toBe('https://example.test/a')
  })

  it('rejects bare strings that would resolve against the page', () => {
    for (const bad of ['false', 'true', 'null', 'undefined', '/false', './x', '//example.test/x', 'example.test']) {
      expect(safeExternalUrl(bad)).toBeNull()
    }
  })

  it('rejects non-strings and empty values', () => {
    for (const bad of [false, true, null, undefined, 0, {}, '', '   ']) {
      expect(safeExternalUrl(bad)).toBeNull()
    }
  })

  it('rejects non-web schemes', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'file:///c:/x', 'mailto:a@example.test']) {
      expect(safeExternalUrl(bad)).toBeNull()
    }
  })
})
