/**
 * Segmented — a pill-button group that behaves as a radiogroup.
 *
 * Used for appearance prefs (font size, density) where the options are
 * small and mutually exclusive. Renders inside a .settings-row so the
 * label + hint appear on the left and the segmented control on the
 * right, matching the visual pattern of other toggle/select rows.
 */
import { memo } from 'react'

export default memo(function Segmented({ value, options, onChange, label, hint }) {
  return (
    <div className="settings-row">
      <div className="settings-row-info">
        <span className="settings-row-label">{label}</span>
        {hint && <span className="settings-row-hint">{hint}</span>}
      </div>
      <div className="settings-segmented" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              className={`settings-segmented-btn ${active ? 'settings-segmented-btn-active' : ''}`}
              onClick={() => onChange(opt.id)}
              role="radio"
              aria-checked={active}
            >
              {opt.name}
            </button>
          )
        })}
      </div>
    </div>
  )
})
