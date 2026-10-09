/**
 * User-facing note for a reloaded user turn that carried images.
 * The API returns a count, not the bytes, so this is the only trace of them.
 * Anything that is not a positive integer yields null (older backends omit it).
 */
export function imageCountLabel(n) {
  if (!Number.isInteger(n) || n < 1) return null
  return n === 1 ? '1 image sent' : `${n} images sent`
}
