import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// ─── Self-hosted fonts for style packs (zero-CDN, privacy-respecting) ───
// Fraunces: variable serif for the Hearth pack's display type.
// JetBrains Mono: display + mono for the Cool Hacker pack; also used
//   anywhere monospace is rendered (vault paths, code blocks).
// Inter: clean humanist sans for the Clean pack's single-family discipline
//   and as body-text fallback elsewhere.
import '@fontsource-variable/fraunces'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'

import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
