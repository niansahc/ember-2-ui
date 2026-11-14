import { describe, it, expect } from 'vitest'
import { CONVERSATIONAL_STYLES, GENERATION_HOST_HINT, MODEL_LIST_COPY, hasEmDash } from './settingsCopy.js'

const style = (v) => CONVERSATIONAL_STYLES.find((s) => s.value === v)

describe('Conversational Style copy', () => {
  it('Balanced and Thoughtful are the approved strings', () => {
    expect(style('balanced').desc).toBe('Default, a mix of warmth and substance')
    expect(style('thoughtful').desc).toBe('Fuller responses with more context and detail')
  })
  it('no style description has an em dash', () => {
    expect(CONVERSATIONAL_STYLES.filter((s) => hasEmDash(s.desc))).toEqual([])
  })
  it('no style description says "reasoning" (collides with the thinking toggle)', () => {
    expect(CONVERSATIONAL_STYLES.filter((s) => /reasoning/i.test(s.desc))).toEqual([])
  })
  it('control: the scanner flags the retired Balanced string', () => {
    expect(hasEmDash('Default — mix of warmth and substance')).toBe(true)
    expect(hasEmDash('Default, a mix of warmth and substance')).toBe(false)
  })
})

describe('generation host and model list copy', () => {
  it('host hint is the approved copy and contains no address', () => {
    expect(GENERATION_HOST_HINT).toBe('These models run on another computer.')
    expect(GENERATION_HOST_HINT).not.toMatch(/\d+\.\d+|:\d{2,5}/)
  })
  it('control: the address pattern does match a raw host:port', () => {
    expect('Text generation via 10.0.0.5:11434').toMatch(/\d+\.\d+|:\d{2,5}/)
  })
  it('error copy is the approved strings', () => {
    expect(MODEL_LIST_COPY).toEqual({ error: "Couldn't load models.", retry: 'Try again' })
  })
})
