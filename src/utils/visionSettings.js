/**
 * visionSettings.js — resolve the two vision settings from backend
 * preferences, with a one-time promotion path off legacy localStorage.
 *
 * Background (issue #131). Vision was the only behavior toggle in Settings
 * that wrote to localStorage and nowhere else. Everything beside it —
 * conversational_style, deviation_enabled, web_search_autonomous, idle_timeout
 * — round-trips through PATCH /v1/preferences and lands in the vault's
 * preferences.json. So vision was browser-scoped: it didn't survive a vault
 * swap, didn't follow you to another device, and vanished on a clean install.
 *
 * The fix moves the source of truth to preferences. But users out there
 * already have values sitting in localStorage, and dropping them on the floor
 * would silently flip someone's deliberate "off" back to "on". Hence the
 * promotion: the first time we see a prefs response with no vision keys in it,
 * we seed from localStorage and push those values up.
 *
 * The subtle part is what "no vision keys" means. getPreferences() soft-fails
 * to {} by design (src/api/ember.js) — a dead backend and a backend that has
 * simply never been told about vision return the *same* object. We can't tell
 * them apart, so we treat both as "promote from local", and we deliberately
 * do NOT delete the localStorage keys afterward. If the promotion PATCH
 * failed because nothing was listening, the local value is still there for
 * the next attempt. Once prefs carry the keys, prefs win every time and the
 * stale local values are simply ignored. Belt and braces, cheap ones.
 *
 * Pure function, no DOM — lives here rather than inline in Settings.jsx so it
 * can be tested in the Vitest node lane (same reasoning as greeting.js).
 */

// Matches the backend's DEFAULT_VISION_MODEL (ember-2/src/llm/vision_service.py)
// and .env.example. Keep these in sync — since the UI now PATCHes this value
// into the vault on promotion, a wrong default here writes a wrong value there.
export const DEFAULT_VISION_MODEL = 'qwen3-vl:8b'

// localStorage keys from the pre-#131 implementation. Read-only now; nothing
// writes them anymore. They stay for the promotion fallback described above.
export const LEGACY_ENABLED_KEY = 'ember-vision-enabled'
export const LEGACY_MODEL_KEY = 'ember-vision-model'

/**
 * Read the legacy localStorage values. Returns { enabled, model } where each
 * is null when absent. Wrapped in try/catch because localStorage throws in
 * private-browsing modes and sandboxed iframes.
 *
 * @returns {{ enabled: string|null, model: string|null }} raw string values
 */
export function readLegacyVisionSettings() {
  try {
    return {
      enabled: localStorage.getItem(LEGACY_ENABLED_KEY),
      model: localStorage.getItem(LEGACY_MODEL_KEY),
    }
  } catch {
    return { enabled: null, model: null }
  }
}

/**
 * Resolve the effective vision settings.
 *
 * @param {object} prefs  the GET /v1/preferences response (may be {})
 * @param {{ enabled?: string|null, model?: string|null }} legacy
 *        raw localStorage values, as returned by readLegacyVisionSettings()
 * @returns {{ enabled: boolean, model: string, needsPromotion: boolean }}
 *
 * needsPromotion is true only when prefs carries neither key — that is the
 * one-time upgrade path, and the caller should PATCH the resolved values up.
 */
export function resolveVisionSettings(prefs = {}, legacy = {}) {
  const p = prefs || {}
  const l = legacy || {}

  const hasEnabled = p.vision_enabled !== undefined && p.vision_enabled !== null
  const hasModel = typeof p.vision_model === 'string' && p.vision_model !== ''

  // Note the explicit undefined/null check rather than the `prefs.x || false`
  // idiom used elsewhere in Settings.jsx. Vision defaults to ON, so collapsing
  // absent-to-false would turn vision off for everyone on first load — the
  // exact bug the promotion path exists to prevent.
  if (hasEnabled || hasModel) {
    return {
      enabled: hasEnabled ? Boolean(p.vision_enabled) : legacyEnabled(l.enabled),
      model: hasModel ? p.vision_model : legacyModel(l.model),
      needsPromotion: false,
    }
  }

  return {
    enabled: legacyEnabled(l.enabled),
    model: legacyModel(l.model),
    needsPromotion: true,
  }
}

// Anything that isn't the literal string 'false' reads as enabled. Preserves
// the pre-#131 default-on behavior, including the absent-key case.
function legacyEnabled(raw) {
  return raw !== 'false'
}

function legacyModel(raw) {
  return raw || DEFAULT_VISION_MODEL
}
