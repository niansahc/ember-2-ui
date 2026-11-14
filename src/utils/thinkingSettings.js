/**
 * thinkingSettings.js — pure logic for the "Think before replying" toggle.
 *
 * Backend contract (ember-2 PR #316): GET/POST /v1/settings/thinking, body
 * { enabled, model, supported: true|false|null, cloud }. This file owns the
 * two things worth testing without a DOM: what the row should show for a given
 * server state, and the optimistic-update-with-rollback flow. Settings.jsx only
 * wires the results into React state (Vitest here runs in node, no React).
 *
 * Internal field names (enabled/supported/cloud/model) never reach the screen;
 * every user-visible string is in THINKING_COPY.
 */

// Approved copy. Do not paraphrase.
export const THINKING_COPY = {
  label: 'Think before replying',
  on: 'Takes longer, works through the question first.',
  off: 'Replies faster.',
  unsupported: "This model doesn't support thinking.",
  unknown: "Couldn't check whether this model supports thinking.",
  saveError: "Couldn't save this setting. Try again.",
  loadError: "Couldn't load this setting.",
}

/**
 * What the row shows for a given state.
 *
 * @param {{ status: 'loading'|'error'|'ready', enabled?: boolean,
 *           supported?: boolean|null, cloud?: boolean }} state
 * @returns {{ checked: boolean, disabled: boolean, hint: string }}
 *
 * A disabled toggle still shows the stored value: "unsupported" is about the
 * active model, not about whether the user's preference is on.
 */
export function deriveThinkingView(state) {
  const s = state || { status: 'loading' }
  if (s.status === 'loading') return { checked: false, disabled: true, hint: '' }
  if (s.status === 'error') return { checked: false, disabled: true, hint: THINKING_COPY.loadError }

  const checked = Boolean(s.enabled)
  if (s.supported === false || s.cloud === true) {
    return { checked, disabled: true, hint: THINKING_COPY.unsupported }
  }
  if (s.supported === null || s.supported === undefined) {
    return { checked, disabled: false, hint: THINKING_COPY.unknown }
  }
  return { checked, disabled: false, hint: checked ? THINKING_COPY.on : THINKING_COPY.off }
}

/**
 * Normalise a server body into ready state. Missing/odd fields degrade to the
 * "couldn't check" path (supported null) rather than pretending support.
 */
export function readyFromBody(body) {
  const b = body || {}
  return {
    status: 'ready',
    enabled: Boolean(b.enabled),
    supported: b.supported === true || b.supported === false ? b.supported : null,
    cloud: b.cloud === true,
    model: typeof b.model === 'string' ? b.model : '',
  }
}

/**
 * Optimistic toggle with rollback. The caller has already painted `next`;
 * this awaits the save and says what the UI should settle on.
 *
 * @param {{ current: object, next: boolean, save: (enabled: boolean) => Promise<object> }} args
 *        current = the ready state before the click
 * @returns {Promise<{ ok: true, state: object } | { ok: false, state: object, error: string }>}
 *          on failure, state is exactly `current` (the rollback target)
 */
export async function toggleThinking({ current, next, save }) {
  try {
    const body = await save(next)
    return { ok: true, state: readyFromBody(body) }
  } catch {
    return { ok: false, state: current, error: THINKING_COPY.saveError }
  }
}
