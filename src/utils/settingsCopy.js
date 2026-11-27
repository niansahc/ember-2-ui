/**
 * settingsCopy.js: approved user-facing strings for Settings > General that
 * are worth pinning in a node-lane test (no DOM needed).
 *
 * Internal fields (generation_host and friends) never reach the screen; the
 * Local tab says where models run in words, never by address.
 */

// Approved by Chas. Do not paraphrase.
export const GENERATION_HOST_HINT = 'These models run on another computer.'

export const MODEL_LIST_COPY = {
  error: "Couldn't load models.",
  retry: 'Try again',
}

export const CONVERSATIONAL_STYLES = [
  { value: 'casual', label: 'Casual', desc: 'Shorter, informal, conversational' },
  { value: 'balanced', label: 'Balanced', desc: 'Default, a mix of warmth and substance' },
  { value: 'thoughtful', label: 'Thoughtful', desc: 'Fuller responses with more context and detail' },
]

const EM_DASH = '—'

/** True when a user-facing string contains an em dash. */
export function hasEmDash(text) {
  return typeof text === 'string' && text.includes(EM_DASH)
}
