import { useState, useEffect } from 'react'
import { mockGetOllamaModels } from '../../api/mock.js'
import {
  getModel as realGetModel,
  setModel as realSetModel,
  getProviderKey,
  setProviderKey,
} from '../../api/ember.js'
import { useModal } from '../../hooks/useModal.js'
import './Settings.css'

// Cloud models by provider (matches CLOUD_MODELS in config.py)
const CLOUD_MODELS = {
  anthropic: [
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', desc: 'Best value. 8.7/10, fastest, cheapest.' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4.6', desc: '8.5/10, 1M token context window.' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', desc: 'Not yet tested against Ember eval.' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Not yet tested against Ember eval.' },
  ],
}

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openai', name: 'OpenAI' },
]

export default function Settings({ isOpen, onClose, onOpenBugReport, onOpenUpdates, onOpenAbout, theme, setTheme, themes }) {
  const modalRef = useModal(isOpen, onClose)
  const [webSearch, setWebSearch] = useState(true)
  const [rememberConvo, setRememberConvo] = useState(true)
  const [tone, setTone] = useState('balanced')
  const [currentModel, setCurrentModel] = useState('')
  const [visionEnabled, setVisionEnabled] = useState(false)
  const [visionModel, setVisionModel] = useState('llama3.2-vision:11b')
  const [localModels, setLocalModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelTab, setModelTab] = useState('local') // 'local' | 'cloud'

  // Cloud provider state
  const [providerStatus, setProviderStatus] = useState({}) // { anthropic: { configured: true }, ... }
  const [addingProvider, setAddingProvider] = useState(false)
  const [newProviderType, setNewProviderType] = useState('anthropic')
  const [newProviderKey, setNewProviderKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setLoadingModels(true)
    async function loadModels() {
      try {
        const data = await realGetModel()
        if (data.model) {
          setCurrentModel(data.model)
          // Set tab based on current model
          if (data.model.startsWith('claude-') || data.model.startsWith('gpt-')) {
            setModelTab('cloud')
          } else {
            setModelTab('local')
          }
        }
        if (data.available && data.available.length > 0) {
          setLocalModels(data.available)
        }
        // Check if vision model is configured
        if (data.vision_model) {
          setVisionEnabled(true)
          setVisionModel(data.vision_model)
        }
      } catch {
        console.warn('[Settings] Model API unreachable, using mock')
        const list = await mockGetOllamaModels()
        setLocalModels(list)
      } finally {
        setLoadingModels(false)
      }
    }
    loadModels()

    // Check provider key status
    async function checkProviders() {
      const status = {}
      for (const p of PROVIDERS) {
        try {
          const result = await getProviderKey(p.id)
          status[p.id] = result
        } catch {
          status[p.id] = { configured: false }
        }
      }
      setProviderStatus(status)
    }
    checkProviders()
  }, [isOpen])

  async function handleSelectModel(modelId) {
    setCurrentModel(modelId)
    try {
      await realSetModel(modelId)
    } catch {
      console.warn('[Settings] Failed to switch model')
    }
  }

  async function handleSaveProviderKey() {
    if (!newProviderKey.trim()) return
    setSavingKey(true)
    try {
      await setProviderKey(newProviderType, newProviderKey.trim())
      setProviderStatus((prev) => ({
        ...prev,
        [newProviderType]: { configured: true },
      }))
      setNewProviderKey('')
      setAddingProvider(false)
    } catch {
      console.warn('[Settings] Failed to save provider key')
    } finally {
      setSavingKey(false)
    }
  }

  if (!isOpen) return null

  const visionModels = localModels.filter(
    (m) => m.toLowerCase().includes('vision') || m.toLowerCase().includes('llava'),
  )
  const textModels = localModels.filter(
    (m) => !m.toLowerCase().includes('vision') && !m.toLowerCase().includes('llava'),
  )

  const configuredProviders = PROVIDERS.filter((p) => providerStatus[p.id]?.configured)
  const unconfiguredProviders = PROVIDERS.filter((p) => !providerStatus[p.id]?.configured)

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

          {/* Tab selector */}
          <div className="model-tabs" role="tablist">
            <button
              className={`model-tab ${modelTab === 'local' ? 'model-tab-active' : ''}`}
              onClick={() => setModelTab('local')}
              role="tab"
              aria-selected={modelTab === 'local'}
            >
              Local
            </button>
            <button
              className={`model-tab ${modelTab === 'cloud' ? 'model-tab-active' : ''}`}
              onClick={() => setModelTab('cloud')}
              role="tab"
              aria-selected={modelTab === 'cloud'}
            >
              Cloud
            </button>
          </div>

          {/* Local tab */}
          {modelTab === 'local' && (
            <div className="model-list" role="tabpanel">
              {loadingModels ? (
                <p className="model-list-empty">Loading models...</p>
              ) : textModels.length === 0 ? (
                <p className="model-list-empty">No local models found. Install one with <code>ollama pull qwen3:8b</code></p>
              ) : (
                textModels.map((m) => (
                  <button
                    key={m}
                    className={`model-list-item ${m === currentModel ? 'model-list-item-active' : ''}`}
                    onClick={() => handleSelectModel(m)}
                  >
                    <span className="model-list-item-name">{m}</span>
                    {m === currentModel && <span className="model-list-item-check">Active</span>}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Cloud tab */}
          {modelTab === 'cloud' && (
            <div className="model-list" role="tabpanel">
              <div className="cloud-disclosure">
                When using a cloud model, your conversation and relevant memories are sent to your cloud provider for processing. Your vault, history, and files remain on your device. Check your provider's terms for their data handling policy.
              </div>

              {configuredProviders.length === 0 && !addingProvider && (
                <p className="model-list-empty">No cloud providers configured. Add an API key to get started.</p>
              )}

              {configuredProviders.map((provider) => (
                <div key={provider.id} className="cloud-provider-section">
                  <div className="cloud-provider-name">{provider.name}</div>
                  {CLOUD_MODELS[provider.id]?.map((m) => (
                    <button
                      key={m.id}
                      className={`model-list-item ${m.id === currentModel ? 'model-list-item-active' : ''}`}
                      onClick={() => handleSelectModel(m.id)}
                    >
                      <div className="model-list-item-info">
                        <span className="model-list-item-name">{m.name}</span>
                        <span className="model-list-item-desc">{m.desc}</span>
                      </div>
                      {m.id === currentModel && <span className="model-list-item-check">Active</span>}
                    </button>
                  ))}
                </div>
              ))}

              {/* Add provider form */}
              {addingProvider ? (
                <div className="cloud-add-form">
                  <select
                    className="settings-select"
                    value={newProviderType}
                    onChange={(e) => setNewProviderType(e.target.value)}
                  >
                    {unconfiguredProviders.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="password"
                    className="cloud-key-input"
                    placeholder="API key"
                    value={newProviderKey}
                    onChange={(e) => setNewProviderKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveProviderKey()}
                    autoFocus
                  />
                  <div className="cloud-add-actions">
                    <button className="settings-action-btn" onClick={handleSaveProviderKey} disabled={savingKey}>
                      {savingKey ? 'Saving...' : 'Save'}
                    </button>
                    <button className="settings-action-btn" onClick={() => { setAddingProvider(false); setNewProviderKey('') }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : unconfiguredProviders.length > 0 && (
                <button className="cloud-add-btn" onClick={() => setAddingProvider(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add provider
                </button>
              )}
            </div>
          )}

          <hr className="settings-divider" />

          {/* ── Vision ──────────────────────────────────────────── */}
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
