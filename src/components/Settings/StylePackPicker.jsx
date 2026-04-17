/**
 * StylePackPicker — card grid for choosing a style pack.
 *
 * Renders a 2×2 grid on ≥600px viewports, collapsing to a single
 * column on narrower screens. Each card shows a small "Aa" preview
 * rendered in the pack's distinctive display font, the pack name,
 * and a one-line description.
 *
 * Clicking commits the change via setStylePack (no hover preview,
 * by design — clean simple commit, user can always click back).
 */
import { memo } from 'react'

export default memo(function StylePackPicker({ stylePack, setStylePack, packs }) {
  return (
    <div
      className="style-pack-picker"
      role="radiogroup"
      aria-label="Choose a style pack"
    >
      {packs.map((p) => {
        const active = stylePack === p.id
        return (
          <button
            key={p.id}
            className={`style-pack-card ${active ? 'style-pack-card-active' : ''}`}
            onClick={() => setStylePack(p.id)}
            role="radio"
            aria-checked={active}
            aria-label={`${p.name} — ${p.description}`}
          >
            <span
              className={`style-pack-preview style-pack-preview-${p.id}`}
              aria-hidden="true"
            >
              <span className="style-pack-preview-text">Aa</span>
            </span>
            <span className="style-pack-card-text">
              <span className="style-pack-name">{p.name}</span>
              <span className="style-pack-desc">{p.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
})
