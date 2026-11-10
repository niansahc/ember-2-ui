import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  THINKING_COPY,
  deriveThinkingView,
  readyFromBody,
  toggleThinking,
} from './thinkingSettings.js'
import { getThinking, setThinking } from '../api/ember.js'

// Synthetic server bodies only.
const body = (o = {}) => ({ enabled: true, model: 'synthetic-model', supported: true, cloud: false, ...o })

describe('deriveThinkingView', () => {
  it('supported + on: checked, on copy, enabled', () => {
    expect(deriveThinkingView(readyFromBody(body()))).toEqual({ checked: true, disabled: false, hint: THINKING_COPY.on })
  })
  it('supported + off: unchecked, off copy, enabled', () => {
    expect(deriveThinkingView(readyFromBody(body({ enabled: false })))).toEqual({ checked: false, disabled: false, hint: THINKING_COPY.off })
  })
  it('supported false: disabled with unsupported copy', () => {
    const v = deriveThinkingView(readyFromBody(body({ supported: false })))
    expect(v.disabled).toBe(true)
    expect(v.hint).toBe("This model doesn't support thinking.")
  })
  it('cloud true: disabled with unsupported copy even if supported is true', () => {
    const v = deriveThinkingView(readyFromBody(body({ cloud: true, supported: true })))
    expect(v.disabled).toBe(true)
    expect(v.hint).toBe("This model doesn't support thinking.")
  })
  it('supported null: toggle stays enabled, couldn\'t-check copy', () => {
    const v = deriveThinkingView(readyFromBody(body({ supported: null })))
    expect(v.disabled).toBe(false)
    expect(v.hint).toBe("Couldn't check whether this model supports thinking.")
  })
  it('disabled row still shows the stored value', () => {
    expect(deriveThinkingView(readyFromBody(body({ supported: false, enabled: true }))).checked).toBe(true)
  })
  it('loading: disabled, no hint', () => {
    expect(deriveThinkingView({ status: 'loading' })).toEqual({ checked: false, disabled: true, hint: '' })
  })
  it('load error: disabled with load-error copy', () => {
    expect(deriveThinkingView({ status: 'error' })).toEqual({ checked: false, disabled: true, hint: "Couldn't load this setting." })
  })
  it('missing/odd supported degrades to unknown, not supported', () => {
    expect(readyFromBody({ enabled: true }).supported).toBe(null)
  })
})

describe('toggleThinking', () => {
  const cur = (enabled) => readyFromBody(body({ enabled }))

  it('success returns the server body as state (positive control: state DOES move)', async () => {
    const save = vi.fn().mockResolvedValue(body({ enabled: false }))
    const r = await toggleThinking({ current: cur(true), next: false, save })
    expect(save).toHaveBeenCalledWith(false)
    expect(r.ok).toBe(true)
    expect(r.state.enabled).toBe(false)
    expect(r.error).toBeUndefined()
  })
  it.each([
    ['400', new Error('enabled must be true or false')],
    ['500', new Error('Could not save the thinking setting')],
    ['network', new TypeError('Failed to fetch')],
  ])('%s failure rolls back to the pre-click state with the approved error', async (_n, err) => {
    const r = await toggleThinking({ current: cur(true), next: false, save: vi.fn().mockRejectedValue(err) })
    expect(r.ok).toBe(false)
    expect(r.state).toEqual(cur(true))
    expect(r.error).toBe("Couldn't save this setting. Try again.")
  })
  it('rolls back false -> true attempt to false', async () => {
    const r = await toggleThinking({ current: cur(false), next: true, save: vi.fn().mockRejectedValue(new Error('x')) })
    expect(r.state.enabled).toBe(false)
  })
})

describe('thinking API', () => {
  afterEach(() => vi.unstubAllGlobals())
  const stub = (res) => { const f = vi.fn().mockResolvedValue(res); vi.stubGlobal('fetch', f); return f }
  const resp = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data })

  it('getThinking GETs /v1/settings/thinking and returns the body', async () => {
    const f = stub(resp(200, body()))
    expect(await getThinking()).toEqual(body())
    expect(f.mock.calls[0][0]).toBe('/v1/settings/thinking')
  })
  it('setThinking POSTs {enabled} as JSON', async () => {
    const f = stub(resp(200, body({ enabled: false })))
    await setThinking(false)
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('/v1/settings/thinking')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ enabled: false })
  })
  it('throws the server detail on 400', async () => {
    stub(resp(400, { detail: 'enabled must be true or false' }))
    await expect(setThinking(true)).rejects.toThrow('enabled must be true or false')
  })
  it('throws the server detail on 500', async () => {
    stub(resp(500, { detail: 'Could not save the thinking setting' }))
    await expect(setThinking(true)).rejects.toThrow('Could not save the thinking setting')
  })
  it('throws on 401 with no detail', async () => {
    stub({ ok: false, status: 401, json: async () => { throw new Error('no body') } })
    await expect(getThinking()).rejects.toThrow('API error 401')
  })
  it('throws when the network fails (no soft-fail)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(getThinking()).rejects.toThrow('Failed to fetch')
  })
})
