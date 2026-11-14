import { describe, it, expect } from 'vitest'
import { deriveModelListView } from './modelListView.js'

describe('deriveModelListView', () => {
  it('loading', () => {
    expect(deriveModelListView({ status: 'loading', models: [] })).toBe('loading')
  })
  it('error', () => {
    expect(deriveModelListView({ status: 'error', models: [] })).toBe('error')
  })
  it('ready with no models is the install hint (control: success + [] stays empty)', () => {
    expect(deriveModelListView({ status: 'ready', models: [] })).toBe('empty')
  })
  it('ready with models lists them', () => {
    expect(deriveModelListView({ status: 'ready', models: ['synthetic:1b'] })).toBe('list')
  })
  it('a failed load is never reported as empty, even with no models', () => {
    expect(deriveModelListView({ status: 'error', models: [] })).not.toBe('empty')
  })
})
