/**
 * useTheme — manages theme selection and custom color generation.
 *
 * Preset themes are applied via a data-theme attribute on <html> that activates
 * CSS variable sets defined in index.css. The "custom" theme works differently:
 * it computes a full set of CSS variables from a user-chosen accent + background
 * pair and injects them as inline styles on the root element.
 */
import { useState, useEffect, useCallback } from 'react'

const THEMES = [
  { id: 'ember', name: 'Ember', preview: ['#0d0520', '#ff8c00', '#f5e6d0'] },
  { id: 'midnight', name: 'Midnight', preview: ['#101010', '#c0c0c0', '#e8e8e8'] },
  { id: 'forest', name: 'Forest', preview: ['#0a160e', '#6bcb8b', '#d4e8d8'] },
  { id: 'ocean', name: 'Ocean', preview: ['#0a1525', '#5ba8f5', '#d4e4f4'] },
  { id: 'bloom', name: 'Bloom', preview: ['#faf6f7', '#c75b7a', '#2d2030'] },
  { id: 'custom', name: 'Custom', preview: null },
]

const STORAGE_KEY = 'ember-theme'
const CUSTOM_COLORS_KEY = 'ember-theme-custom'

const DEFAULT_CUSTOM = { accent: '#ff8c00', bg: '#0d0520' }

// --- Color math utilities ---
// These convert and manipulate hex colors to derive a full palette from
// a single accent + background pair. Used only by the "custom" theme.

// Parse "#rrggbb" to [r, g, b] integers via bitwise extraction.
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Linear interpolation toward white. amount 0 = unchanged, 1 = pure white.
function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex)
  const f = (c) => Math.min(255, Math.round(c + (255 - c) * amount))
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// Linear interpolation toward black. amount 0 = unchanged, 1 = pure black.
function darken(hex, amount) {
  const [r, g, b] = hexToRgb(hex)
  const f = (c) => Math.max(0, Math.round(c * (1 - amount)))
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// WCAG 2.1 relative luminance (0 = black, 1 = white).
// Uses the sRGB linearization formula from the spec.
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Threshold of 0.3 chosen to flip text/surface contrast for light vs dark backgrounds.
function isLightColor(hex) {
  return luminance(hex) > 0.3
}

// Derives a complete CSS variable set from an accent + background pair.
// Surfaces, text, borders, and glow effects are all computed so the
// custom theme stays internally consistent regardless of input colors.
function buildCustomVars(colors) {
  const { accent, bg } = colors
  const light = isLightColor(bg)
  const [r, g, b] = hexToRgb(accent)

  return {
    '--bg-primary': bg,
    '--bg-surface': light ? darken(bg, 0.05) : lighten(bg, 0.05),
    '--bg-surface-hover': light ? darken(bg, 0.1) : lighten(bg, 0.1),
    '--bg-input': light ? lighten(bg, 0.03) : darken(bg, 0.05),
    '--accent': accent,
    '--accent-hover': lighten(accent, 0.15),
    '--accent-dim': `rgba(${r}, ${g}, ${b}, 0.12)`,
    '--text-primary': light ? '#1a1a1a' : '#eeeeee',
    '--text-secondary': light ? '#555555' : '#aaaaaa',
    '--text-muted': light ? '#888888' : '#777777',
    '--border': light ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.06)',
    '--border-focus': accent,
    '--ember-glow': `0 0 20px rgba(${r}, ${g}, ${b}, 0.2)`,
    '--ember-glow-strong': `0 0 30px rgba(${r}, ${g}, ${b}, 0.35)`,
    '--code-bg': `rgba(${r}, ${g}, ${b}, 0.08)`,
    '--code-block-bg': darken(bg, 0.15),
    '--error': '#e85d5d',
    '--user-bubble-bg': light ? darken(bg, 0.05) : lighten(bg, 0.05),
    '--user-bubble-border': light ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.06)',
    '--user-bubble-text': light ? '#1a1a1a' : '#eeeeee',
  }
}

function loadCustomColors() {
  try {
    const stored = localStorage.getItem(CUSTOM_COLORS_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return DEFAULT_CUSTOM
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'ember'
  })

  const [customColors, setCustomColorsState] = useState(loadCustomColors)

  const applyCustomVars = useCallback((colors) => {
    const vars = buildCustomVars(colors)
    const root = document.documentElement
    Object.entries(vars).forEach(([prop, val]) => root.style.setProperty(prop, val))
  }, [])

  const clearCustomVars = useCallback(() => {
    const root = document.documentElement
    const vars = buildCustomVars(DEFAULT_CUSTOM)
    Object.keys(vars).forEach((prop) => root.style.removeProperty(prop))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)

    if (theme === 'custom') {
      applyCustomVars(customColors)
    } else {
      clearCustomVars()
    }
  }, [theme, customColors, applyCustomVars, clearCustomVars])

  function setCustomColors(colors) {
    const merged = { ...customColors, ...colors }
    setCustomColorsState(merged)
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(merged))
  }

  // Update the preview array for the custom theme entry
  const themesWithPreview = THEMES.map((t) =>
    t.id === 'custom'
      ? { ...t, preview: [customColors.bg, customColors.accent, isLightColor(customColors.bg) ? '#1a1a1a' : '#eeeeee'] }
      : t,
  )

  return {
    theme,
    setTheme: setThemeState,
    themes: themesWithPreview,
    customColors,
    setCustomColors,
  }
}
