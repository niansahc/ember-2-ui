import { useState, useEffect } from 'react'
import { mockGetOllamaModels } from '../../api/mock.js'
import {
  getModel as realGetModel,
  setModel as realSetModel,
  getProviderKey,
  setProviderKey,
  deleteProviderKey,
  getPreferences,
  updatePreferences,
  getPinStatus,
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
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Fast, cheap. Not yet tested against Ember eval.' },
    { id: 'gpt-4o', name: 'GPT-4o', desc: 'Strong reasoning. Not yet tested against Ember eval.' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: '128K context. Not yet tested against Ember eval.' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Cheapest OpenAI option. Not yet tested.' },
  ],
}

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openai', name: 'OpenAI' },
]

export default function Settings({ isOpen, onClose, onOpenBugReport, onOpenUpdates, onOpenAbout, onModelChange, theme, setTheme, themes }) {
  const modalRef = useModal(isOpen, onClose)
  const [webSearch, setWebSearch] = useState(true)
  const [rememberConvo, setRememberConvo] = useState(true)
  const [tone, setTone] = useState('balanced')
  const [currentModel, setCurrentModel] = useState('')
  const [visionEnabled, setVisionEnabled] = useState(() => {
    try { return localStorage.getItem('ember-vision-enabled') !== 'false' } catch { return true }
  })
  const [visionModel, setVisionModel] = useState(() => {
    try { return localStorage.getItem('ember-vision-model') || 'llama3.2-vision:11b' } catch { return 'llama3.2-vision:11b' }
  })
  const [localModels, setLocalModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelTab, setModelTab] = useState('local') // 'local' | 'cloud'

  // Cloud provider state
  const [providerStatus, setProviderStatus] = useState({}) // { anthropic: { configured: true }, ... }
  const [addingKeyFor, setAddingKeyFor] = useState(null) // provider id or null
  const [keyInput, setKeyInput] = useState('')
  const [keySaving, setKeySaving] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [confirmingRemove, setConfirmingRemove] = useState(null) // provider id or null
  const [vaultPathRevealed, setVaultPathRevealed] = useState(false)
  const [vaultCopied, setVaultCopied] = useState(false)
  const [securityPinSet, setSecurityPinSet] = useState(false)
  const [lockOnLaunch, setLockOnLaunch] = useState(false)
  const [idleLockEnabled, setIdleLockEnabled] = useState(false)
  const [idleTimeout, setIdleTimeout] = useState(15)

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

    // Load conversational style preference
    async function loadPreferences() {
      try {
        const [prefs, pinStatus] = await Promise.all([getPreferences(), getPinStatus()])
        if (prefs.conversational_style) setTone(prefs.conversational_style)
        setLockOnLaunch(prefs.lock_on_launch || false)
        setIdleLockEnabled(prefs.idle_lock_enabled || false)
        setIdleTimeout(prefs.idle_timeout || 15)
        setSecurityPinSet(pinStatus.pin_set)
      } catch {}
    }
    loadPreferences()
  }, [isOpen])

  async function handleSelectModel(modelId) {
    try {
      await realSetModel(modelId)
      setCurrentModel(modelId)
      onModelChange?.(modelId)
    } catch {
      console.warn('[Settings] Failed to switch model')
    }
  }

  async function handleSaveKey(providerId) {
    if (!keyInput.trim()) return
    setKeySaving(true)
    setKeyError('')
    try {
      await setProviderKey(providerId, keyInput.trim())
      setProviderStatus((prev) => ({ ...prev, [providerId]: { configured: true } }))
      setAddingKeyFor(null)
      setKeyInput('')
    } catch (err) {
      setKeyError('Failed to save key. Check the API and try again.')
    } finally {
      setKeySaving(false)
    }
  }

  async function handleRemoveKey(providerId) {
    try {
      await deleteProviderKey(providerId)
      setProviderStatus((prev) => ({ ...prev, [providerId]: { configured: false } }))
    } catch {
      console.warn('[Settings] Failed to remove key')
    }
  }

  if (!isOpen) return null

  const visionModels = localModels.filter(
    (m) => m.toLowerCase().includes('vision') || m.toLowerCase().includes('llava'),
  )
  const textModels = localModels.filter(
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
              <span className="settings-row-label">
                Can Ember search the web?
                <span className="settings-info-icon" tabIndex={0} role="button" aria-label="Web search privacy information">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span className="settings-info-tooltip">
                    Web search queries are sent through a local SearXNG instance running on your machine. SearXNG forwards queries to external search engines without exposing your IP address or identity. Your queries are not stored. Disable web search here to keep all processing fully local.
                  </span>
                </span>
              </span>
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

          <div className="settings-style-section">
            <div className="settings-row-info">
              <span className="settings-row-label">Conversational Style</span>
              <span className="settings-row-hint">Controls how Ember responds</span>
            </div>
            <div className="settings-style-options" role="radiogroup" aria-label="Conversational style">
              {[
                { value: 'casual', label: 'Casual', desc: 'Shorter, informal, conversational' },
                { value: 'balanced', label: 'Balanced', desc: 'Default — mix of warmth and substance' },
                { value: 'thoughtful', label: 'Thoughtful', desc: 'Fuller responses with more context and reasoning' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`settings-style-option ${tone === opt.value ? 'settings-style-option-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="conversational_style"
                    value={opt.value}
                    checked={tone === opt.value}
                    onChange={() => {
                      setTone(opt.value)
                      updatePreferences({ conversational_style: opt.value })
                    }}
                    className="sr-only"
                  />
                  <span className="settings-style-label">{opt.label}</span>
                  <span className="settings-style-desc">{opt.desc}</span>
                </label>
              ))}
            </div>
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
              {PROVIDERS.map((provider) => {
                const configured = providerStatus[provider.id]?.configured
                const models = CLOUD_MODELS[provider.id] || []
                const isAdding = addingKeyFor === provider.id

                return (
                  <div key={provider.id} className="cloud-provider-section">
                    <div className="cloud-provider-header">
                      <span className="cloud-provider-name">{provider.name}</span>
                      {configured ? (
                        <span className="cloud-provider-status cloud-provider-configured">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Configured
                        </span>
                      ) : (
                        <span className="cloud-provider-status cloud-provider-not-configured">Not configured</span>
                      )}
                    </div>

                    {configured && models.map((m) => (
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

                    {configured && confirmingRemove !== provider.id && (
                      <button className="cloud-remove-key-btn" onClick={() => setConfirmingRemove(provider.id)}>
                        Remove key
                      </button>
                    )}

                    {confirmingRemove === provider.id && (
                      <div className="cloud-remove-confirm">
                        <p className="cloud-remove-confirm-text">
                          Remove your {provider.name} API key? You'll need to add it again to use cloud models.
                        </p>
                        <div className="cloud-key-actions">
                          <button className="settings-action-btn" onClick={() => setConfirmingRemove(null)}>Cancel</button>
                          <button className="settings-action-btn cloud-remove-confirm-btn" onClick={() => { handleRemoveKey(provider.id); setConfirmingRemove(null) }}>Remove</button>
                        </div>
                      </div>
                    )}

                    {!configured && !isAdding && (
                      <button className="cloud-add-key-btn" onClick={() => { setAddingKeyFor(provider.id); setKeyInput(''); setKeyError('') }}>
                        Add API key
                      </button>
                    )}

                    {isAdding && (
                      <div className="cloud-key-form">
                        <p className="cloud-key-disclosure">
                          Your key is stored securely in your system's credential store on this device. It never leaves your machine and is never stored in a file.
                        </p>
                        <input
                          type="password"
                          className="cloud-key-input"
                          placeholder={`${provider.name} API key`}
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveKey(provider.id)}
                          autoFocus
                        />
                        {keyError && <p className="cloud-key-error">{keyError}</p>}
                        <div className="cloud-key-actions">
                          <button className="settings-action-btn cloud-key-save" onClick={() => handleSaveKey(provider.id)} disabled={keySaving}>
                            {keySaving ? 'Saving...' : 'Save'}
                          </button>
                          <button className="settings-action-btn" onClick={() => { setAddingKeyFor(null); setKeyInput(''); setKeyError('') }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="cloud-disclosure">
                When using a cloud model, your conversation and relevant memories are sent to your cloud provider for processing. Your vault, history, and files remain on your device.
              </div>
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
                onChange={(e) => { setVisionEnabled(e.target.checked); try { localStorage.setItem('ember-vision-enabled', String(e.target.checked)) } catch {} }}
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
                onChange={(e) => { setVisionModel(e.target.value); try { localStorage.setItem('ember-vision-model', e.target.value) } catch {} }}
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

          {/* ── Security ───────────────────────────────────────── */}
          <div className="settings-section-label">Security</div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Lock on launch</span>
              <span className="settings-row-hint">Require PIN when Ember opens</span>
            </div>
            <label className="toggle" aria-label="Toggle lock on launch">
              <input
                type="checkbox" role="switch"
                checked={lockOnLaunch}
                onChange={(e) => {
                  setLockOnLaunch(e.target.checked)
                  updatePreferences({ lock_on_launch: e.target.checked })
                }}
              />
              <span className="toggle-track" />
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Lock after idle</span>
              <span className="settings-row-hint">Auto-lock after inactivity</span>
            </div>
            <label className="toggle" aria-label="Toggle idle lock">
              <input
                type="checkbox" role="switch"
                checked={idleLockEnabled}
                onChange={(e) => {
                  setIdleLockEnabled(e.target.checked)
                  updatePreferences({ idle_lock_enabled: e.target.checked })
                }}
              />
              <span className="toggle-track" />
            </label>
          </div>

          {idleLockEnabled && (
            <div className="settings-row settings-row-nested">
              <div className="settings-row-info">
                <span className="settings-row-label">Idle timeout</span>
                <span className="settings-row-hint">Minutes before auto-lock</span>
              </div>
              <select
                className="settings-select"
                value={idleTimeout}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setIdleTimeout(val)
                  updatePreferences({ idle_timeout: val })
                }}
                aria-label="Idle timeout minutes"
              >
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          )}

          {!securityPinSet && (
            <button
              className="settings-action-btn"
              onClick={() => { onClose(); window.dispatchEvent(new Event('ember-show-pin-setup')) }}
            >
              Set up PIN
            </button>
          )}

          {securityPinSet && (
            <button
              className="settings-action-btn settings-action-btn-danger"
              onClick={() => {
                // PIN removal is a sensitive operation — for MVP, direct to settings
                alert('To remove your PIN, use the recovery passphrase flow or contact support.')
              }}
            >
              Remove PIN
            </button>
          )}

          <hr className="settings-divider" />

          {/* ── System ────────────────────────────────────────── */}
          <div className="settings-section-label">System</div>

          <div className="settings-row vault-path-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Where is my vault?</span>
              <span className="settings-row-hint settings-row-path">
                {vaultPathRevealed ? 'C:\\EmberVault' : '••••••••••••'}
              </span>
            </div>
            <div className="vault-path-actions">
              <button
                className="vault-path-icon-btn"
                onClick={() => {
                  setVaultPathRevealed(true)
                  setTimeout(() => setVaultPathRevealed(false), 10000)
                }}
                aria-label={vaultPathRevealed ? 'Path visible' : 'Reveal vault path'}
                title={vaultPathRevealed ? 'Hiding in 10s' : 'Reveal path'}
              >
                {vaultPathRevealed ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
              <button
                className="vault-path-icon-btn"
                onClick={() => {
                  navigator.clipboard.writeText('C:\\EmberVault').then(() => {
                    setVaultCopied(true)
                    setTimeout(() => setVaultCopied(false), 2000)
                  })
                }}
                aria-label="Copy vault path"
                title={vaultCopied ? 'Copied!' : 'Copy path'}
              >
                {vaultCopied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
              <button className="settings-action-btn" aria-label="Open vault folder">
                Open
              </button>
            </div>
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
