/**
 * AppearanceContext — the single home for all "how the app looks" state.
 *
 * Theme, style pack, font scale, density, and reduced-motion used to be
 * instantiated in App.jsx purely to be forwarded — 16 props threaded straight
 * through to Settings, which App never read itself. That was the textbook
 * pass-through drill (issue #24). They live here now: App wraps the tree once,
 * Settings (and the StylePackPicker) just ask for what they need.
 *
 * Why a Provider that calls the hooks (rather than holding raw state): each of
 * these hooks already owns its localStorage persistence AND the side-effect
 * that writes the `data-*` attribute onto <html>. Calling them here preserves
 * all of that untouched — the Provider is a thin gathering point, not a rewrite.
 *
 * Re-render note: the Provider only re-renders when one of the five hook values
 * actually changes (a theme switch, a density toggle) — i.e. exactly when its
 * consumers should re-render anyway. These are rare, user-initiated changes, so
 * no memoization gymnastics are warranted.
 */
import { createContext, useContext } from 'react'
import { useTheme } from '../hooks/useTheme.js'
import { useStylePack } from '../hooks/useStylePack.js'
import { useFontScale } from '../hooks/useFontScale.js'
import { useDensity } from '../hooks/useDensity.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

const AppearanceContext = createContext(null)

export function AppearanceProvider({ children }) {
  const { theme, setTheme, themes, customColors, setCustomColors } = useTheme()
  const { stylePack, setStylePack, packs: stylePacks } = useStylePack()
  const { scale: fontScale, setScale: setFontScale, scales: fontScales } = useFontScale()
  const { density, setDensity, densities } = useDensity()
  const { reduced: motionReduced, setReduced: setMotionReduced } = useReducedMotion()

  const value = {
    theme, setTheme, themes, customColors, setCustomColors,
    stylePack, setStylePack, stylePacks,
    fontScale, setFontScale, fontScales,
    density, setDensity, densities,
    motionReduced, setMotionReduced,
  }

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}

/** Read appearance state/setters. Throws if used outside the provider. */
export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (ctx === null) {
    throw new Error('useAppearance must be used within an <AppearanceProvider>')
  }
  return ctx
}
