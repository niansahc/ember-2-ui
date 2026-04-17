/**
 * useReducedMotion — user override for motion reduction.
 *
 * OS-level `prefers-reduced-motion: reduce` is ALWAYS respected via a
 * media query in index.css. This hook lets the user additionally
 * force motion reduction even when the OS hasn't advertised it — via
 * a data-motion="reduce" attribute with higher specificity than any
 * style pack.
 *
 * Persists boolean under 'ember-reduced-motion' ('on' | 'off').
 * Default is 'off' (OS preference drives behavior untouched).
 */
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'ember-reduced-motion'

function readInitial() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on'
  } catch { return false }
}

export function useReducedMotion() {
  const [reduced, setReducedState] = useState(readInitial)

  useEffect(() => {
    if (reduced) {
      document.documentElement.setAttribute('data-motion', 'reduce')
    } else {
      document.documentElement.removeAttribute('data-motion')
    }
  }, [reduced])

  const setReduced = useCallback((on) => {
    setReducedState(!!on)
    try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off') } catch {}
  }, [])

  return { reduced, setReduced }
}
