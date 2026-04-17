/**
 * useStylePack — manages style pack selection.
 *
 * Style packs are a typography + spacing + motion + decoration layer that
 * composes with the color theme system. Packs NEVER define colors — they
 * reference color tokens from the active theme (var(--accent), etc.).
 *
 * Selection is applied via `data-style-pack` attribute on <html>, mirroring
 * the `data-theme` pattern used by useTheme. Preference persists in
 * localStorage under the key 'ember-style-pack'.
 *
 * A URL query param (?style-pack=hacker) overrides localStorage for the
 * session — useful for development, screenshots, and sharing specific pack
 * states without changing the user's saved preference.
 */
import { useState, useEffect, useCallback } from 'react'

const PACKS = [
  {
    id: 'og',
    name: 'Ember',
    description: 'The original. System font, familiar feel, warm radii.',
  },
  {
    id: 'hearth',
    name: 'Hearth',
    description: 'Late-night study. Serif display, tonal layering, halo atmospherics.',
  },
  {
    id: 'hacker',
    name: 'Cool Hacker',
    description: 'File drawer energy. Mono headers, bracketed labels, cursor blinks.',
  },
  {
    id: 'clean',
    name: 'Clean',
    description: 'Less but better. Single typeface, strict grid, restrained accent.',
  },
]

const STORAGE_KEY = 'ember-style-pack'
const URL_PARAM = 'style-pack'
const DEFAULT_PACK = 'og'

function isValidPack(id) {
  return PACKS.some((p) => p.id === id)
}

function readUrlParam() {
  try {
    const params = new URLSearchParams(window.location.search)
    const p = params.get(URL_PARAM)
    if (p && isValidPack(p)) return p
  } catch {}
  return null
}

function readInitialPack() {
  const fromUrl = readUrlParam()
  if (fromUrl) return fromUrl
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isValidPack(stored)) return stored
  } catch {}
  return DEFAULT_PACK
}

/**
 * Returns { stylePack, setStylePack, packs }.
 *
 * Persistence model:
 * - The effect below only mirrors state to the DOM attribute, never to
 *   localStorage. This keeps the URL param (?style-pack=...) ephemeral:
 *   visiting with the param sets the pack for the session without
 *   overwriting the user's saved preference.
 * - localStorage is written only in setStylePack — i.e. only when the
 *   user explicitly picks a pack from the UI.
 */
export function useStylePack() {
  const [stylePack, setStylePackState] = useState(readInitialPack)

  useEffect(() => {
    document.documentElement.setAttribute('data-style-pack', stylePack)
  }, [stylePack])

  const setStylePack = useCallback((id) => {
    if (!isValidPack(id)) return
    setStylePackState(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch {}
  }, [])

  return { stylePack, setStylePack, packs: PACKS }
}
