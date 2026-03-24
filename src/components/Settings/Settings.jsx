import { useState, useEffect } from 'react'
import { mockGetOllamaModels } from '../../api/mock.js'
import { getModel as realGetModel } from '../../api/ember.js'
import { useModal } from '../../hooks/useModal.js'
import './Settings.css'

export default function Settings({ isOpen, onClose, onOpenBugReport, onOpenUpdates, onOpenAbout, theme, setTheme, themes }) {
  const modalRef = useModal(isOpen, onClose)
  const [webSearch, setWebSearch] = useState(true)
  const [rememberConvo, setRememberConvo] = useState(true)
  const [tone, setTone] = useState('balanced')
  const [model, setModel] = useState('qwen2.5:14b')
  const [visionEnabled, setVisionEnabled] = useState(false)
  const [visionModel, setVisionModel] = useState('llama3.2-vision:11b')
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)

  useEffect(() => {
    if (isOpen && models.length === 0) {
      setLoadingModels(true)
      async function loadModels() {
        try {
          const data = await realGetModel()
          if (data.available && data.available.length > 0) {
            setModels(data.available)
            if (data.model) setModel(data.model)
          } else {
            throw new Error('No models from API')
          }
        } catch {
          console.warn('[Settings] Model API unreachable, using mock')
          const list = await mockGetOllamaModels()
          setModels(list)
        } finally {
          setLoadingModels(false)
        }
      }
      loadModels()
    }
  }, [isOpen])

  if (!isOpen) return null

  const visionModels = models.filter(
    (m) => m.toLowerCase().includes('vision') || m.toLowerCase().includes('llava'),
  )
  const textModels = models.filter(
    (m) => !m.toLowerCase().includes('vision') && !m.toLowerCase().includes('llava'),
  )

  return (
    <>
      <div className="settings-overlay" onClick={onClose} aria-hidden="true" />
      <aside ref={modalRef} className="settings-panel" role="dialog" aria-label="Settings" aria-modal="true">
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings-body">
          {/* ── Appearance ───────────────────────────────────── */}
          <div className="settings-section-label">Appearance</div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Theme</span>
            </div>
          </div>
          <div className="theme-picker" role="radiogroup" aria-label="Choose a theme">
            {themes?.map((t) => (
              <button
                key={t.id}
                className={`theme-swatch ${theme === t.id ? 'theme-swatch-active' : ''}`}
                onClick={() => setTheme(t.id)}
                role="radio"
                aria-checked={theme === t.id}
                aria-label={t.name}
                title={t.name}
              >
                <div className="theme-swatch-colors">
                  <span className="theme-swatch-bg" style={{ background: t.preview[0] }} />
                  <span className="theme-swatch-accent" style={{ background: t.preview[1] }} />
                  <span className="theme-swatch-text" style={{ background: t.preview[2] }} />
                </div>
                <span className="theme-swatch-name">{t.name}</span>
              </button>
            ))}
          </div>

          <hr className="settings-divider" />

          {/* ── Conversation ──────────────────────────────────── */}
          <div className="settings-section-label">Conversation</div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Can Ember search the web?</span>
              <span className="settings-row-hint">Enables live web results via SearXNG</span>
            </div>
            <label className="toggle" aria-label="Toggle web search">
              <input
                type="checkbox" role="switch"
                checked={webSearch}
                onChange={(e) => setWebSearch(e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Should Ember remember this conversation?</span>
              <span className="settings-row-hint">Saves this conversation to your vault</span>
            </div>
            <label className="toggle" aria-label="Toggle conversation memory">
              <input
                type="checkbox" role="switch"
                checked={rememberConvo}
                onChange={(e) => setRememberConvo(e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">How should Ember talk to me?</span>
              <span className="settings-row-hint">Sets the conversational style</span>
            </div>
            <select
              className="settings-select"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              aria-label="Conversation tone"
            >
              <option value="casual">Casual</option>
              <option value="balanced">Balanced</option>
              <option value="thoughtful">Thoughtful</option>
            </select>
          </div>

          <hr className="settings-divider" />

          {/* ── Models ────────────────────────────────────────── */}
          <div className="settings-section-label">Models</div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Ember's brain</span>
              <span className="settings-row-hint">The model used for conversation and reasoning</span>
            </div>
            <select
              className="settings-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              aria-label="Primary model"
              disabled={loadingModels}
            >
              {loadingModels && <option>Loading...</option>}
              {textModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              {/* Include vision models in the list too, in case someone wants to use one as primary */}
              {visionModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Can Ember see images?</span>
              <span className="settings-row-hint">Enables image analysis in chat</span>
            </div>
            <label className="toggle" aria-label="Toggle vision model">
              <input
                type="checkbox" role="switch"
                checked={visionEnabled}
                onChange={(e) => setVisionEnabled(e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>

          {visionEnabled && (
            <div className="settings-row settings-row-nested">
              <div className="settings-row-info">
                <span className="settings-row-label">Vision model</span>
                <span className="settings-row-hint">Used when you send images</span>
              </div>
              <select
                className="settings-select"
                value={visionModel}
                onChange={(e) => setVisionModel(e.target.value)}
                aria-label="Vision model"
              >
                {visionModels.length > 0 ? (
                  visionModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))
                ) : (
                  <option value="">No vision models found</option>
                )}
              </select>
            </div>
          )}

          <hr className="settings-divider" />

          {/* ── System ────────────────────────────────────────── */}
          <div className="settings-section-label">System</div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Where is my vault?</span>
              <span className="settings-row-hint settings-row-path">C:\EmberVault</span>
            </div>
            <button className="settings-action-btn" aria-label="Open vault folder">
              Open
            </button>
          </div>

          <button className="settings-link-btn" onClick={onOpenUpdates}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 105.26-11.49L1 10" />
            </svg>
            Check for updates
          </button>

          <button className="settings-link-btn" onClick={onOpenBugReport}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Report a bug
          </button>

          <button className="settings-link-btn" onClick={onOpenAbout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            About Ember
          </button>
        </div>
      </aside>
    </>
  )
}
