/**
 * Generate a UUID that works in non-secure contexts (HTTP, Tailscale IP).
 * crypto.randomUUID() requires HTTPS or localhost — this falls back to
 * Math.random when it's not available.
 */
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts — RFC 4122 v4 UUID template.
  // The '4' in position 13 marks this as version 4.
  // The 'y' positions use (r & 0x3) | 0x8 to set the variant bits (10xx per spec).
  // `| 0` is a fast Math.floor() for positive numbers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
