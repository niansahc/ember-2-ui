/**
 * modelListView.js: which of the four Local-tab list states to show.
 *
 * A failed or hung /model request is its own state. It must never read as
 * "no models installed" (that sends the user to `ollama pull` for a problem
 * that is not theirs), and it must never fall back to invented models (ADR 0003).
 *
 * @param {{ status: 'loading'|'error'|'ready', models: string[] }} state
 * @returns {'loading'|'error'|'empty'|'list'}
 */
export function deriveModelListView({ status, models }) {
  if (status === 'loading') return 'loading'
  if (status === 'error') return 'error'
  return models.length === 0 ? 'empty' : 'list'
}
