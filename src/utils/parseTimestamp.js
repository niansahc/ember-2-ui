/**
 * Parse Ember vault timestamps into valid Date objects.
 *
 * The vault uses hyphenated time separators for filename safety:
 *   "2026-03-31T14-30-00" instead of "2026-03-31T14:30:00"
 *
 * JavaScript's Date constructor cannot parse the hyphenated form.
 * This normalizes the time portion before parsing.
 */
export function parseEmberTimestamp(ts) {
  if (!ts) return null
  // Convert hyphenated time portion to colons: T14-30-00 → T14:30:00
  // Also handles microsecond suffix: T14-30-00-123456 → T14:30:00
  const normalized = ts.replace(/T(\d{2})-(\d{2})-(\d{2})(?:-\d+)?/, 'T$1:$2:$3')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}
