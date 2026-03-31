import { useState, useCallback, useEffect } from 'react'
import Splash from './components/Splash/Splash.jsx'
import Sidebar from './components/Sidebar/Sidebar.jsx'
import Chat from './components/Chat/Chat.jsx'
import Settings from './components/Settings/Settings.jsx'
import BugReport from './components/BugReport/BugReport.jsx'
import Updates from './components/Updates/Updates.jsx'
import About from './components/About/About.jsx'
import { getModel as realGetModel } from './api/ember.js'
import { useChat } from './hooks/useChat.js'
import { parseEmberTimestamp } from './utils/parseTimestamp.js'
import { useTheme } from './hooks/useTheme.js'
import './App.css'

function isCloudModelName(name) {
  return name && (name.startsWith('claude-') || name.startsWith('gpt-'))
}

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
  const [bugReportOpen, setBugReportOpen] = useState(false)
  const [updatesOpen, setUpdatesOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [activeConversation, setActiveConversation] = useState(null)
  const [activeProject, setActiveProject] = useState('general')
  const [model, setModel] = useState(null)

  const { messages, isStreaming, sessionId, sendMessage, stopStreaming, clearMessages, loadConversation, regenerate, setProjectForNewConversation, editAndResend } = useChat()

  // Sync active conversation to localStorage when messages arrive in a new session
  useEffect(() => {
    if (messages.length > 0 && sessionId && !activeConversation) {
      setActiveConversation(sessionId)
      try { localStorage.setItem('ember_active_session', sessionId) } catch {}
    }
  }, [messages.length, sessionId, activeConversation])
  const { theme, setTheme, themes } = useTheme()

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
    // Fetch full model info for accurate display
    realGetModel().then((data) => {
      if (data.model) setModel(data.model)
    }).catch(() => {})
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
    loadConversation(id)
  }

  if (view === 'splash') {
    return <Splash onConnected={handleConnected} />
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
        onRenameConversation={(id, name) => console.log('rename', id, name)}
        onDeleteConversation={(id) => { if (activeConversation === id) clearMessages(); }}
        onOpenSettings={() => { setSettingsOpen(true); setSidebarOpen(false) }}
        onOpenUpdates={() => { setUpdatesOpen(true); setSidebarOpen(false) }}
        onOpenAbout={() => { setAboutOpen(true); setSidebarOpen(false) }}
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
            {model && (
              <button
                className="app-model-indicator"
                onClick={() => setSettingsOpen(true)}
                title={model}
                aria-label={`Current model: ${model}. Click to change.`}
              >
                <span className={`app-model-dot ${isCloudModelName(model) ? 'app-model-dot-cloud' : ''}`} />
                <span className="app-model-name">{displayModelName(model)}</span>
              </button>
            )}
          </div>
          <div className="app-header-actions">
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

        <Chat
          messages={messages}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onStop={stopStreaming}
          onRegenerate={regenerate}
          onEdit={editAndResend}
        />
      </main>

      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenBugReport={() => { setBugReportOpen(true); setSettingsOpen(false) }}
        onOpenUpdates={() => { setUpdatesOpen(true); setSettingsOpen(false) }}
        onOpenAbout={() => { setAboutOpen(true); setSettingsOpen(false) }}
        onModelChange={setModel}
        theme={theme}
        setTheme={setTheme}
        themes={themes}
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
