/**
 * Citation link safety.
 *
 * Web-search source URLs come from a search result, not from this app, and
 * the backend passes them through unvalidated. A bare string such as "false"
 * is truthy, so `<a href="false">` resolved against the page and opened
 * http://localhost:3000/false in a new tab. Only absolute http(s) URLs become
 * links; anything else is rendered as plain text by the caller.
 *
 * Returns the normalized href, or null when the value is not linkable.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
export function safeExternalUrl(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  let parsed
  try {
    // No base: a relative value must throw, not resolve against the page.
    parsed = new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  return parsed.href
}
