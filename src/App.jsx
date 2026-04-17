/**
 * App — root component and global state orchestrator.
 *
 * Manages view routing (splash → chat), lock screen, onboarding,
 * PIN setup, sidebar/settings modals, keyboard shortcuts, and
 * session restore from localStorage.
 */
import { useState, useCallback, useEffect } from 'react'
import Splash from './components/Splash/Splash.jsx'
import Sidebar from './components/Sidebar/Sidebar.jsx'
import Chat from './components/Chat/Chat.jsx'
import Settings from './components/Settings/Settings.jsx'
import BugReport from './components/BugReport/BugReport.jsx'
import Updates from './components/Updates/Updates.jsx'
import About from './components/About/About.jsx'
import LockScreen from './components/LockScreen/LockScreen.jsx'
import PinSetup from './components/LockScreen/PinSetup.jsx'
import PinChange from './components/LockScreen/PinChange.jsx'
import ServiceStatus from './components/ServiceStatus/ServiceStatus.jsx'
import Onboarding from './components/Onboarding/Onboarding.jsx'
import { Search, HelpCircle, CheckCircle, GitBranch, Database, Flame, X } from 'lucide-react'
import { getModel as realGetModel, getPinStatus, getPreferences, updatePreferences, getDeveloperStatus } from './api/ember.js'
import { useChat } from './hooks/useChat.js'
import { parseEmberTimestamp } from './utils/parseTimestamp.js'
import { useTheme } from './hooks/useTheme.js'
import { useStylePack } from './hooks/useStylePack.js'
import { useFontScale } from './hooks/useFontScale.js'
import { useDensity } from './hooks/useDensity.js'
import { useReducedMotion } from './hooks/useReducedMotion.js'
import { useTour } from './hooks/useTour.js'
import { useIdleTimeout } from './hooks/useIdleTimeout.js'
import './App.css'
import './styles/tour.css'

// Abbreviate model IDs for the header pill (e.g. "claude-3-haiku-..." → "Claude Haiku").
function displayModelName(name) {
  if (!name) return ''
  if (name.startsWith('claude-')) {
    if (name.includes('haiku')) return 'Claude Haiku'
    if (name.includes('sonnet')) return 'Claude Sonnet'
    if (name.includes('opus')) return 'Claude Opus'
    return name
  }
  if (name.startsWith('gpt-')) return name
  return name.length > 15 ? name.slice(0, 13) + '...' : name
}

export default function App() {
  const [view, setView] = useState('splash')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] = useState(null)
  const [bugReportOpen, setBugReportOpen] = useState(false)
  const [updatesOpen, setUpdatesOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [activeConversation, setActiveConversation] = useState(null)
  const [activeProject, setActiveProject] = useState('general')
  const [model, setModel] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [showPinChange, setShowPinChange] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingInitial, setOnboardingInitial] = useState({ profile: {}, lodestone: {} })
  // Returning-user greeting — populated from prefs after first load.
  // `userName` is parsed from onboarding's free-form identity answer.
  // `hasOnboarded` gates between the welcome copy (first-timers) and
  // the personalized time-of-day greeting (returning users).
  const [userName, setUserName] = useState(null)
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [pinIsSet, setPinIsSet] = useState(false)
  const [lockPrefs, setLockPrefs] = useState({ lock_on_launch: false, idle_timeout: 15 })
  const [devMode, setDevMode] = useState(false)
  const [devVaultLabel, setDevVaultLabel] = useState(null)
  const [webSearchOn, setWebSearchOn] = useState(false)
  const [searchAutonomous, setSearchAutonomous] = useState(false)
  const [deviationOn, setDeviationOn] = useState(false)

  const { messages, isStreaming, streamingStatus, sessionId, sendMessage, stopStreaming, clearMessages, loadConversation, regenerate, setProjectForNewConversation, setChatOptions, editAndResend } = useChat()
  const [bareMode, setBareMode] = useState(false)
  const [vaultOff, setVaultOff] = useState(false)

  // Guided first-run tour — shows once for new users, only when not locked
  useTour(view === 'chat' && !isLocked && !showPinSetup)

  // Check PIN status and lock preferences on app load
  useEffect(() => {
    if (view !== 'chat') return
    async function checkLock() {
      try {
        const [pinStatus, prefs] = await Promise.all([getPinStatus(), getPreferences()])
        setPinIsSet(pinStatus.pin_set)
        const lp = {
          lock_on_launch: prefs.lock_on_launch || false,
          idle_timeout: prefs.idle_timeout || 15,
          idle_lock_enabled: prefs.idle_lock_enabled || false,
        }
        setLockPrefs(lp)

        // Lock on launch if PIN is set and lock_on_launch is enabled
        if (pinStatus.pin_set && lp.lock_on_launch) {
          setIsLocked(true)
        }

        // Show onboarding for new users who haven't completed it
        if (!prefs.onboarding_complete) {
          setOnboardingInitial({
            profile: prefs.onboarding_profile_answers || {},
            lodestone: prefs.onboarding_lodestone_answers || {},
          })
          setShowOnboarding(true)
        }
        // For returning users, capture data used by the personalized
        // chat-empty greeting. `identity` is a free-form string like
        // "Alex, they/them" — the Chat component parses out the first
        // name at render time.
        setHasOnboarded(!!prefs.onboarding_complete)
        setUserName(prefs.onboarding_profile_answers?.identity || null)

        // Show PIN setup prompt for new users (once, after tour)
        if (!pinStatus.pin_set && !prefs.pin_setup_dismissed && prefs.first_run_tour_complete) {
          setShowPinSetup(true)
        }

        // feature flags for header icons
        setWebSearchOn(prefs.web_search !== false)
        setSearchAutonomous(prefs.web_search_autonomous || false)
        setDeviationOn(prefs.deviation_enabled || false)
      } catch {}
    }
    checkLock()

    // Developer mode — fetch vault label for header/sidebar badges
    async function checkDevMode() {
      try {
        const result = await getDeveloperStatus()
        setDevMode(result.dev_mode || false)
        if (result.active_vault) setDevVaultLabel(result.active_vault.label)
      } catch {}
    }
    checkDevMode()
  }, [view])

  // Listen for PIN setup request from Settings
  useEffect(() => {
    function handlePinSetup() { setShowPinSetup(true) }
    window.addEventListener('ember-show-pin-setup', handlePinSetup)
    return () => window.removeEventListener('ember-show-pin-setup', handlePinSetup)
  }, [])

  // Listen for PIN change request from Settings
  useEffect(() => {
    function handlePinChange() { setShowPinChange(true) }
    window.addEventListener('ember-show-pin-change', handlePinChange)
    return () => window.removeEventListener('ember-show-pin-change', handlePinChange)
  }, [])

  // Idle timeout — lock after N minutes of inactivity
  useIdleTimeout(
    lockPrefs.idle_timeout,
    () => { if (pinIsSet) setIsLocked(true) },
    pinIsSet && lockPrefs.idle_lock_enabled && !isLocked,
  )

  // Persist new session ID to localStorage so the conversation survives a page refresh.
  // Only fires once per session — when the first message arrives and no conversation is
  // tracked yet. Subsequent messages in the same session are a no-op.
  useEffect(() => {
    if (messages.length > 0 && sessionId && !activeConversation) {
      setActiveConversation(sessionId)
      try { localStorage.setItem('ember_active_session', sessionId) } catch {}
    }
  }, [messages.length, sessionId, activeConversation])
  const { theme, setTheme, themes, customColors, setCustomColors } = useTheme()
  const { stylePack, setStylePack, packs: stylePacks } = useStylePack()
  const { scale: fontScale, setScale: setFontScale, scales: fontScales } = useFontScale()
  const { density, setDensity, densities } = useDensity()
  const { reduced: motionReduced, setReduced: setMotionReduced } = useReducedMotion()

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      // Escape closes sidebar
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
        return
      }
      // Ctrl/Cmd+N — new conversation
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handleNewConversation()
        return
      }
      // Ctrl/Cmd+Shift+E — export conversation
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        exportConversation()
        return
      }
      // Ctrl/Cmd+, — open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen((prev) => !prev)
        return
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [sidebarOpen, messages])

  function exportConversation() {
    if (messages.length === 0) return
    const md = messages
      .map((m) => `**${m.role === 'user' ? 'You' : 'Ember'}** (${(parseEmberTimestamp(m.timestamp) || new Date()).toLocaleString()})\n\n${m.content}`)
      .join('\n\n---\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ember-conversation-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleConnected = useCallback((detectedModel) => {
    setModel(detectedModel)
    setView('chat')
    // Splash already provides the model from /api/health — no need for a
    // redundant GET /model here. Settings will fetch fresh model info when
    // opened. Dropping this saves one network request on every boot.
    // Restore active conversation from localStorage if one was saved
    try {
      const savedSession = localStorage.getItem('ember_active_session')
      if (savedSession) {
        setActiveConversation(savedSession)
        loadConversation(savedSession).catch(() => {
          // Saved session no longer exists — fall back to blank state
          setActiveConversation(null)
          localStorage.removeItem('ember_active_session')
        })
      }
    } catch {}
  }, [loadConversation])

  function handleNewConversation(projectId) {
    clearMessages()
    setActiveConversation(null)
    setBareMode(false)
    setVaultOff(false)
    setChatOptions({ bareMode: false, vaultEnabled: true })
    try { localStorage.removeItem('ember_active_session') } catch {}
    setSidebarOpen(false)
    // If started from a project view, assign new conversation to that project
    if (projectId && projectId !== 'general') {
      setProjectForNewConversation(projectId)
    }
  }

  function handleSelectConversation(id, projectId) {
    setActiveConversation(id)
    try { localStorage.setItem('ember_active_session', id) } catch {}
    if (projectId) setActiveProject(projectId)
    setSidebarOpen(false)
    // Per-conversation toggles reset on any conversation entry — vault ON, bare OFF.
    // setChatOptions clears the ref-side flags so the next request sends defaults.
    setBareMode(false)
    setVaultOff(false)
    setChatOptions({ bareMode: false, vaultEnabled: true })
    loadConversation(id)
  }

  if (view === 'splash') {
    return <Splash onConnected={handleConnected} />
  }

  // Lock screen — renders over everything when locked
  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />
  }

  // Onboarding — first-run structured flow
  if (showOnboarding) {
    return (
      <Onboarding
        initialProfile={onboardingInitial.profile}
        initialLodestone={onboardingInitial.lodestone}
        onComplete={(lodestoneData) => {
          setShowOnboarding(false)
          // Open Settings to Memory tab with findings expanded
          setSettingsOpen(true)
          setSettingsInitialTab('memory:expanded')
        }}
      />
    )
  }

  // PIN setup prompt — after tour, before first use
  if (showPinSetup) {
    return (
      <PinSetup
        onComplete={() => {
          setShowPinSetup(false)
          setPinIsSet(true)
        }}
        onSkip={() => {
          setShowPinSetup(false)
          updatePreferences({ pin_setup_dismissed: true }).catch(() => {})
        }}
      />
    )
  }

  // PIN change flow — triggered from Settings when a PIN already exists
  if (showPinChange) {
    return (
      <PinChange
        onDone={() => setShowPinChange(false)}
        onCancel={() => setShowPinChange(false)}
      />
    )
  }

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        isStreaming={isStreaming}
        onClose={() => setSidebarOpen(false)}
        onNewConversation={handleNewConversation}
        activeConversationId={activeConversation}
        activeProjectId={activeProject}
        onSelectConversation={handleSelectConversation}
        onSelectProject={setActiveProject}
        onDeleteConversation={(id) => { if (activeConversation === id) clearMessages(); }}
        onOpenSettings={() => { setSettingsOpen(true); setSidebarOpen(false) }}
        onOpenUpdates={() => { setUpdatesOpen(true); setSidebarOpen(false) }}
        onOpenAbout={() => { setAboutOpen(true); setSidebarOpen(false) }}
        devVaultLabel={devMode ? devVaultLabel : null}
      />

      <main className="app-main">
        {/* Mobile header */}
        <header className="app-header">
          <button
            className="app-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="app-header-title-group">
            <h1 className="app-header-title">Ember-2</h1>
            {devMode && devVaultLabel && (
              <span className="dev-vault-header-badge" data-testid="dev-vault-header-badge">[{devVaultLabel}]</span>
            )}
            <ServiceStatus />
            {model && (
              <button
                className="app-model-indicator"
                onClick={() => { setSettingsOpen(true); setSettingsInitialTab('general') }}
                title={model}
                aria-label={`Current model: ${model}. Click to change.`}
              >
                <span className="app-model-name">{displayModelName(model)}</span>
              </button>
            )}
            {webSearchOn && (
              <button
                className="app-feature-icon"
                onClick={() => { setSettingsOpen(true); setSettingsInitialTab('features') }}
                title="Web search is on"
                aria-label="Web search is on. Click to open Features settings."
              >
                <Search size={15} aria-hidden="true" />
              </button>
            )}
            {webSearchOn && !searchAutonomous && (
              <button
                className="app-feature-icon"
                onClick={() => { setSettingsOpen(true); setSettingsInitialTab('features') }}
                title="Ask-first mode — Ember asks before searching"
                aria-label="Ask-first mode is on. Click to open Features settings."
              >
                <HelpCircle size={15} aria-hidden="true" />
              </button>
            )}
            {webSearchOn && searchAutonomous && (
              <button
                className="app-feature-icon"
                onClick={() => { setSettingsOpen(true); setSettingsInitialTab('features') }}
                title="Auto-search — Ember searches without asking"
                aria-label="Autonomous search is on. Click to open Features settings."
              >
                <CheckCircle size={15} aria-hidden="true" />
              </button>
            )}
            {bareMode && (
              <button
                className="app-feature-icon"
                onClick={() => { setSettingsOpen(true); setSettingsInitialTab('features') }}
                title="Bare mode — personality off for this conversation"
                aria-label="Bare mode is on for this conversation. Click to open Features settings."
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
            {deviationOn && (
              <button
                className="app-feature-icon"
                onClick={() => { setSettingsOpen(true); setSettingsInitialTab('features') }}
                title="Deviation engine is on"
                aria-label="Deviation engine is on. Click to open Features settings."
              >
                <GitBranch size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="app-header-actions">
            <button
              className={`app-conv-toggle ${bareMode ? 'app-conv-toggle-active' : ''}`}
              onClick={() => {
                const next = !bareMode
                setBareMode(next)
                setChatOptions({ bareMode: next })
              }}
              title={bareMode ? 'Bare mode on — personality off. Click to restore.' : 'Personality on. Click to enable bare mode.'}
              aria-label={bareMode ? 'Bare mode is on. Click to restore personality.' : 'Personality is on. Click to enable bare mode for this conversation.'}
            >
              {bareMode ? <X size={15} aria-hidden="true" /> : <Flame size={15} aria-hidden="true" />}
            </button>
            <button
              className={`app-conv-toggle ${vaultOff ? 'app-conv-toggle-active' : ''}`}
              onClick={() => {
                const next = !vaultOff
                setVaultOff(next)
                setChatOptions({ vaultEnabled: !next })
              }}
              title={vaultOff ? 'Vault off — conversation not saved' : 'Vault on — conversation saved'}
              aria-label={vaultOff ? 'Vault is off. Click to enable saving.' : 'Vault is on. Click to disable saving for this conversation.'}
            >
              <Database size={15} aria-hidden="true" />
            </button>
            {messages.length > 0 && (
              <button
                className="app-header-btn"
                onClick={exportConversation}
                aria-label="Export conversation"
                title="Export (Ctrl+Shift+E)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            )}
          <button
            className="app-header-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings (Ctrl+,)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
          </div>
        </header>

        {vaultOff && (
          <div className="app-vault-banner" role="status">
            Vault off — this conversation won't be saved.
          </div>
        )}

        <Chat
          messages={messages}
          isStreaming={isStreaming}
          streamingStatus={streamingStatus}
          onSend={sendMessage}
          onStop={stopStreaming}
          onRegenerate={regenerate}
          onEdit={editAndResend}
          userName={userName}
          hasOnboarded={hasOnboarded}
        />
      </main>

      <Settings
        isOpen={settingsOpen}
        initialTab={settingsInitialTab}
        onClose={() => {
          setSettingsOpen(false)
          setSettingsInitialTab(null)
          // re-fetch model and feature prefs in case they changed in Settings
          realGetModel().then((data) => { if (data.model) setModel(data.model) }).catch(() => {})
          getPreferences().then((prefs) => {
            setWebSearchOn(prefs.web_search !== false)
            setSearchAutonomous(prefs.web_search_autonomous || false)
            setDeviationOn(prefs.deviation_enabled || false)
          }).catch(() => {})
        }}
        onOpenBugReport={() => { setBugReportOpen(true); setSettingsOpen(false) }}
        onOpenUpdates={() => { setUpdatesOpen(true); setSettingsOpen(false) }}
        onOpenAbout={() => { setAboutOpen(true); setSettingsOpen(false) }}
        onModelChange={setModel}
        theme={theme}
        setTheme={setTheme}
        themes={themes}
        customColors={customColors}
        setCustomColors={setCustomColors}
        stylePack={stylePack}
        setStylePack={setStylePack}
        stylePacks={stylePacks}
        fontScale={fontScale}
        setFontScale={setFontScale}
        fontScales={fontScales}
        density={density}
        setDensity={setDensity}
        densities={densities}
        motionReduced={motionReduced}
        setMotionReduced={setMotionReduced}
      />

      <BugReport
        isOpen={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />

      <Updates
        isOpen={updatesOpen}
        onClose={() => setUpdatesOpen(false)}
      />

      <About
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
        onOpenBugReport={() => { setBugReportOpen(true); setAboutOpen(false) }}
      />
    </div>
  )
}
