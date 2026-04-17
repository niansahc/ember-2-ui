/**
 * Parse Ember vault timestamps into valid Date objects.
 *
 * The vault uses hyphenated time separators for filename safety:
 *   "2026-03-31T14-30-00" instead of "2026-03-31T14:30:00"
 *
 * JavaScript's Date constructor cannot parse the hyphenated form.
 * This normalizes the time portion before parsing.
 */
/**
 * @param {string} ts — timestamp string (standard ISO or vault-hyphenated)
 * @returns {Date|null} — parsed Date, or null on invalid/missing input.
 *   Callers (MessageBubble.formatTime, exportConversation) must handle null.
 */
export function parseEmberTimestamp(ts) {
  if (!ts) return null
  // Convert hyphenated time portion to colons: T14-30-00 → T14:30:00
  // Microsecond suffix (?:-\d+) is stripped — JS Date maxes out at ms precision.
  const normalized = ts.replace(/T(\d{2})-(\d{2})-(\d{2})(?:-\d+)?/, 'T$1:$2:$3')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}
