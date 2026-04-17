/**
 * useDensity — user-selectable spacing density.
 *
 * Multiplies the --space-* token scale via attribute-based overrides
 * in index.css. 'compact' roughly x0.82 the spacing, useful on small
 * screens or for users who prefer denser UIs. Persists under
 * 'ember-density'. Defaults to 'comfortable' (the unchanged scale).
 */
import { useState, useEffect, useCallback } from 'react'

const DENSITIES = [
  { id: 'comfortable', name: 'Comfortable' },
  { id: 'compact', name: 'Compact' },
]

const STORAGE_KEY = 'ember-density'
const DEFAULT = 'comfortable'

function isValid(id) { return DENSITIES.some((d) => d.id === id) }

function readInitial() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isValid(stored)) return stored
  } catch {}
  return DEFAULT
}

export function useDensity() {
  const [density, setDensityState] = useState(readInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
  }, [density])

  const setDensity = useCallback((id) => {
    if (!isValid(id)) return
    setDensityState(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch {}
  }, [])

  return { density, setDensity, densities: DENSITIES }
}
