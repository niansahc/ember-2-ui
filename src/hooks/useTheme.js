import { useState, useEffect } from 'react'

const THEMES = [
  { id: 'ember', name: 'Ember', preview: ['#0d0520', '#ff8c00', '#f5e6d0'] },
  { id: 'midnight', name: 'Midnight', preview: ['#101010', '#c0c0c0', '#e8e8e8'] },
  { id: 'forest', name: 'Forest', preview: ['#0a160e', '#6bcb8b', '#d4e8d8'] },
  { id: 'ocean', name: 'Ocean', preview: ['#0a1525', '#5ba8f5', '#d4e4f4'] },
  { id: 'bloom', name: 'Bloom', preview: ['#faf6f7', '#c75b7a', '#2d2030'] },
]

const STORAGE_KEY = 'ember-theme'

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'ember'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return { theme, setTheme: setThemeState, themes: THEMES }
}
