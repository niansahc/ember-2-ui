/**
 * useFontScale — user-selectable overall font size.
 *
 * Multiplies the --fs-* token scale via attribute-based overrides in
 * index.css. Persists in localStorage under 'ember-font-scale'.
 * Defaults to 'md' (unchanged from the token scale's declared values).
 */
import { useState, useEffect, useCallback } from 'react'

const SCALES = [
  { id: 'sm', name: 'Small' },
  { id: 'md', name: 'Medium' },
  { id: 'lg', name: 'Large' },
]

const STORAGE_KEY = 'ember-font-scale'
const DEFAULT = 'md'

function isValid(id) { return SCALES.some((s) => s.id === id) }

function readInitial() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isValid(stored)) return stored
  } catch {}
  return DEFAULT
}

export function useFontScale() {
  const [scale, setScaleState] = useState(readInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-font-scale', scale)
  }, [scale])

  const setScale = useCallback((id) => {
    if (!isValid(id)) return
    setScaleState(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch {}
  }, [])

  return { scale, setScale, scales: SCALES }
}
