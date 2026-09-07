/**
 * Unit tests for the vision settings resolver (issue #131).
 *
 * The whole point of this helper is the precedence order between backend
 * preferences and the legacy localStorage values, plus knowing when to fire
 * the one-time promotion. Those rules are fiddly enough to be worth pinning
 * down here in the node lane rather than only through a browser — same
 * reasoning as greeting.test.js.
 */
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_VISION_MODEL,
  resolveVisionSettings,
} from './visionSettings.js'

const NO_LEGACY = { enabled: null, model: null }

describe('resolveVisionSettings — preferences present', () => {
  it('uses the preference values and does not ask for promotion', () => {
    const r = resolveVisionSettings(
      { vision_enabled: true, vision_model: 'llava:13b' },
      NO_LEGACY,
    )
    expect(r).toEqual({ enabled: true, model: 'llava:13b', needsPromotion: false })
  })

  it('honors an explicit false rather than treating it as absent', () => {
    // This is the regression that matters most. The `prefs.x || false` idiom
    // used elsewhere in Settings.jsx would be indistinguishable here; vision
    // defaults ON, so absent-collapsed-to-false would silently disable it.
    const r = resolveVisionSettings(
      { vision_enabled: false, vision_model: 'llava:13b' },
      NO_LEGACY,
    )
    expect(r.enabled).toBe(false)
    expect(r.needsPromotion).toBe(false)
  })

  it('lets preferences beat a conflicting localStorage value', () => {
    const r = resolveVisionSettings(
      { vision_enabled: true, vision_model: 'llava:13b' },
      { enabled: 'false', model: 'some-other-model:7b' },
    )
    expect(r).toEqual({ enabled: true, model: 'llava:13b', needsPromotion: false })
  })

  it('does not promote when only one of the two keys is present', () => {
    // A partial state means the backend already knows about vision, so
    // re-promoting would clobber the half it does have. Fall back to legacy
    // for the missing half only.
    const r = resolveVisionSettings(
      { vision_model: 'llava:13b' },
      { enabled: 'false', model: null },
    )
    expect(r).toEqual({ enabled: false, model: 'llava:13b', needsPromotion: false })
  })

  it('treats an empty-string vision_model as absent', () => {
    const r = resolveVisionSettings(
      { vision_enabled: true, vision_model: '' },
      NO_LEGACY,
    )
    expect(r.model).toBe(DEFAULT_VISION_MODEL)
    expect(r.needsPromotion).toBe(false)
  })

  it('treats a null vision_enabled as absent', () => {
    const r = resolveVisionSettings(
      { vision_enabled: null, vision_model: 'llava:13b' },
      { enabled: 'false', model: null },
    )
    expect(r.enabled).toBe(false)
  })
})

describe('resolveVisionSettings — promotion path', () => {
  it('promotes localStorage values when preferences carries neither key', () => {
    const r = resolveVisionSettings(
      { conversational_style: 'balanced' },
      { enabled: 'false', model: 'llava:13b' },
    )
    expect(r).toEqual({ enabled: false, model: 'llava:13b', needsPromotion: true })
  })

  it('promotes defaults when there is nothing stored anywhere', () => {
    const r = resolveVisionSettings({}, NO_LEGACY)
    expect(r).toEqual({
      enabled: true,
      model: DEFAULT_VISION_MODEL,
      needsPromotion: true,
    })
  })

  it('reads any legacy string except "false" as enabled', () => {
    // Matches the pre-#131 read: localStorage.getItem(...) !== 'false'.
    for (const raw of ['true', 'TRUE', '1', '', 'yes', null]) {
      expect(resolveVisionSettings({}, { enabled: raw, model: null }).enabled).toBe(true)
    }
    expect(resolveVisionSettings({}, { enabled: 'false', model: null }).enabled).toBe(false)
  })

  it('still resolves when the prefs fetch soft-failed to {}', () => {
    // getPreferences() returns {} on a dead backend, which is the same thing
    // it returns when vision has simply never been set. We can't tell them
    // apart, so the legacy value must survive either way.
    const r = resolveVisionSettings({}, { enabled: 'false', model: 'llava:13b' })
    expect(r).toEqual({ enabled: false, model: 'llava:13b', needsPromotion: true })
  })
})

describe('resolveVisionSettings — defensive inputs', () => {
  it('survives being called with nothing at all', () => {
    expect(resolveVisionSettings()).toEqual({
      enabled: true,
      model: DEFAULT_VISION_MODEL,
      needsPromotion: true,
    })
  })

  it('survives null arguments', () => {
    expect(resolveVisionSettings(null, null)).toEqual({
      enabled: true,
      model: DEFAULT_VISION_MODEL,
      needsPromotion: true,
    })
  })
})

describe('DEFAULT_VISION_MODEL', () => {
  it('matches the backend default', () => {
    // ember-2/src/llm/vision_service.py DEFAULT_VISION_MODEL and
    // ember-2/.env.example. The UI PATCHes this value into the vault on
    // promotion, so a drift here writes a wrong value to preferences.json.
    expect(DEFAULT_VISION_MODEL).toBe('qwen3-vl:8b')
  })
})
