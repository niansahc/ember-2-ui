/**
 * Conversation id validation.
 *
 * This module exists because a boolean `false` reached the conversation URL
 * builder: a list entry with a non-string id was clicked, the id went into
 * localStorage as the string "false", and the UI requested
 * /v1/conversations/false. Every sink that puts an id into a URL, a header, or
 * localStorage checks it here first, so a bad id is dropped at the edge and
 * never becomes a request.
 *
 * Backend ids are `sess_<hex>`. The character class is wider than that on
 * purpose (underscore, hyphen, digits, letters) so older sessions and the
 * synthetic ids in tests still pass. Anything with a slash, dot, space, or
 * query character does not, which also keeps an id from rewriting its own
 * path.
 */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/

// What String(x) produces for the values that are never ids. A boolean that
// was already written to localStorage comes back as one of these strings, so
// a user who hit the incident once would otherwise keep requesting
// /conversations/false on every boot until the 404 cleared it.
const STRINGIFIED_NON_IDS = new Set(['false', 'true', 'null', 'undefined', 'nan'])

/**
 * True only for a non-empty string made of letters, digits, `_` and `-` that
 * is not the stringified form of a non-id value. Booleans, numbers, null,
 * undefined, objects and path-shaped strings are all rejected.
 *
 * @param {unknown} id
 * @returns {boolean}
 */
export function isValidConversationId(id) {
  if (typeof id !== 'string') return false
  if (!ID_PATTERN.test(id)) return false
  return !STRINGIFIED_NON_IDS.has(id.toLowerCase())
}
