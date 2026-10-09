import { describe, it, expect } from 'vitest'
import { imageCountLabel } from './imageCountLabel.js'

describe('imageCountLabel', () => {
  // Positive control: the null assertions below cannot pass on a function
  // that always returns null, because this one would fail.
  it('names one image in the singular and N images in the plural', () => {
    expect(imageCountLabel(1)).toBe('1 image sent')
    expect(imageCountLabel(3)).toBe('3 images sent')
  })

  it('returns null for zero, negative, fractional, non-numeric, and missing values', () => {
    for (const v of [0, -1, 1.5, '2', null, undefined, NaN]) {
      expect(imageCountLabel(v)).toBeNull()
    }
  })
})
