/**
 * chatError — turns a failed API call into something Ember would actually say.
 *
 * This module exists because of a real incident: the model server stopped
 * overnight after an update, the FastAPI backend stayed up and kept answering
 * /api/health with a 200, and every chat request came back 500. The UI's
 * response was to quietly fall back to a canned mock generator and present
 * invented content as Ember's reply, including invented journal entries and
 * invented web search results. The only signal was a console.warn.
 *
 * So: no fabricated content, ever, and when something breaks the user gets
 * told what broke and what to try. See ADR 0003.
 *
 * Pure functions only, no React and no fetch, so the wording is unit tested
 * in chatError.test.js rather than asserted through a mounted component.
 *
 * Voice: Ember is direct and low-ceremony. First person, contractions, no
 * apology spiral, no therapeutic register, no exclamation marks. Compare the
 * strings she already ships: "That's exactly what I'm not going to do.",
 * "I didn't receive a message.", "I couldn't process **file**:".
 */

/**
 * The local model runtime's user-facing name, in one place.
 *
 * The backend currently dispatches every non-cloud model to Ollama, so this is
 * accurate today. It is a constant rather than an inline string so that adding
 * a second local runtime later is one edit here, not a hunt through the copy
 * table below.
 */
export const LOCAL_RUNTIME_NAME = 'Ollama'

/**
 * Work out which provider serves a model id.
 *
 * Same prefix rule the backend uses in adapter._is_cloud_model and that
 * Settings.jsx uses to pick the local/cloud tab. Duplicated rather than
 * fetched because it is two string comparisons and the alternative is a
 * network call at the exact moment the network is known to be broken.
 *
 * A null model id is a real state, not a bug: App holds the model from the
 * Splash handshake, so a failure early enough in the session has nothing to
 * report yet. That case gets provider-neutral copy rather than a guess.
 */
export function providerForModel(modelId) {
  if (!modelId) return { id: 'unknown', name: null, isCloud: false }
  if (modelId.startsWith('claude-')) return { id: 'anthropic', name: 'Anthropic', isCloud: true }
  if (modelId.startsWith('gpt-')) return { id: 'openai', name: 'OpenAI', isCloud: true }
  return { id: 'local', name: LOCAL_RUNTIME_NAME, isCloud: false }
}

/** Shown when loading a saved conversation fails. */
export const CONVERSATION_LOAD_ERROR =
  "I couldn't load that conversation. My backend may not be running right now."

/**
 * Map a failure to user-facing copy.
 *
 * Every branch names one concrete next step, because that is the test for
 * whether a failure kind earns its own string: "start Ollama", "check your
 * key", and "wait a minute" are different actions, so they are different
 * messages. The Try again button on the error bubble handles resending, so
 * none of these strings tell the user how to retry.
 *
 * @param {{kind?: string, status?: number|null}} error  an EmberApiError, or anything
 * @param {string|null} modelId  the active model id, for provider-aware wording
 * @returns {string}
 */
export function chatErrorMessage(error, modelId = null) {
  const kind = error?.kind || 'unknown'
  const provider = providerForModel(modelId)

  switch (kind) {
    case 'unreachable':
      // Nothing answered, so the model provider is not even in the picture
      // yet. Naming it here would send the user to check the wrong thing.
      return "I can't reach my backend right now. It may have stopped running. Check that Ember-2 is started."

    case 'generation_failed':
      if (provider.isCloud) {
        return `My backend is up, but ${provider.name} didn't return a reply. Your API key may need attention, or their service is having a moment.`
      }
      if (provider.id === 'local') {
        return `My backend is up, but the model didn't answer. ${LOCAL_RUNTIME_NAME} may not be running.`
      }
      return "My backend is up, but the model didn't answer. The model service may not be running."

    case 'unauthorized':
      return "I'm not authorized to talk to my backend. The API key is missing or out of date."

    case 'rate_limited':
      if (provider.isCloud) {
        return `${provider.name} is rate limiting me right now. Give it a minute.`
      }
      return 'My backend is throttling requests right now. Give it a minute.'

    default:
      return error?.status
        ? `Something went wrong talking to my backend (HTTP ${error.status}). Not sure what yet.`
        : 'Something went wrong talking to my backend. Not sure what yet.'
  }
}
