import { useEffect, useState, useRef } from 'react'
import { mockGetConversations, mockGetProjects } from '../../api/mock.js'
import {
  getConversations as realGetConversations,
  renameConversation as realRenameConversation,
  deleteConversation as realDeleteConversation,
  getProjects as realGetProjects,
  createProject as realCreateProject,
  moveConversationToProject as realMoveConversationToProject,
  getVersion,
} from '../../api/ember.js'
import emberMascot from '../../../assets/ember-mascot.png'
import './Sidebar.css'

export default function Sidebar({
  isOpen,
  onClose,
  onNewConversation,
  activeConversationId,
  activeProjectId,
  onSelectConversation,
  onSelectProject,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  onOpenUpdates,
  onOpenAbout,
}) {
  const [conversations, setConversations] = useState([])
  const [projects, setProjects] = useState([])
  const [viewingProject, setViewingProject] = useState(null)
  const [search, setSearch] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const contextRef = useRef(null)

  // Collapse state — persisted in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('ember-sidebar-collapsed') === 'true' } catch { return false }
  })

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('ember-sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  // Load conversations — try real API, fall back to mock
  useEffect(() => {
    async function loadConversations() {
      try {
        const convos = await realGetConversations(100)
        setConversations(
          convos.map((c) => ({
            id: c.id,
            title: c.title,
            updatedAt: c.updated_at,
            projectId: c.project_id || null,
          })),
        )
      } catch {
        console.warn('[Sidebar] API unreachable, using mock conversations')
        mockGetConversations().then(setConversations)
      }
    }
    loadConversations()
    // Load projects — try real API, fall back to mock
    async function loadProjects() {
      try {
        const projs = await realGetProjects()
        setProjects(
          projs.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            conversationCount: p.conversation_count || 0,
          })),
        )
      } catch {
        console.warn('[Sidebar] Projects API unreachable, using mock')
        mockGetProjects().then(setProjects)
      }
    }
    loadProjects()
  }, [])

  // Close context menu on click outside
  useEffect(() => {
    function handleClick(e) {
      if (contextRef.current && !contextRef.current.contains(e.target)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [contextMenu])

  // Close context menu on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setContextMenu(null)
    }
    if (contextMenu) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [contextMenu])

  // Search filter
  const searchLower = search.toLowerCase()
  const filteredConvos = search
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchLower))
    : conversations

  // General conversations = no projectId or projectId === 'general'
  const generalConvos = filteredConvos.filter(
    (c) => !c.projectId || c.projectId === 'general',
  )

  const realProjects = projects.filter((p) => p.id !== 'general')

  const projectConvos = viewingProject
    ? filteredConvos.filter((c) => c.projectId === viewingProject)
    : []

  function getTimeBucket(iso) {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return 'Last 7 days'
    if (diffDays <= 30) return 'Last 30 days'
    return 'Older'
  }

  function groupByTime(convos) {
    const buckets = []
    const seen = new Set()
    for (const label of ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older']) {
      const items = convos.filter((c) => getTimeBucket(c.updatedAt) === label)
      if (items.length > 0 && !seen.has(label)) {
        buckets.push({ label, items })
        seen.add(label)
      }
    }
    return buckets
  }

  function handleProjectClick(projectId) {
    setViewingProject(projectId)
    onSelectProject(projectId)
  }

  function handleConvoClick(convId, projectId) {
    onSelectConversation(convId, projectId || null)
  }

  function handleContextMenu(e, conv) {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, conv })
  }

  async function handleRename() {
    if (!contextMenu) return
    const name = prompt('Rename conversation:', contextMenu.conv.title)
    if (name && name.trim()) {
      // Optimistic UI update
      setConversations((prev) =>
        prev.map((c) => c.id === contextMenu.conv.id ? { ...c, title: name.trim() } : c),
      )
      try {
        await realRenameConversation(contextMenu.conv.id, name.trim())
      } catch {
        console.warn('[Sidebar] Rename API failed, local update only')
      }
      onRenameConversation?.(contextMenu.conv.id, name.trim())
    }
    setContextMenu(null)
  }

  async function handleDelete() {
    if (!contextMenu) return
    // Optimistic UI update
    setConversations((prev) => prev.filter((c) => c.id !== contextMenu.conv.id))
    try {
      await realDeleteConversation(contextMenu.conv.id)
    } catch {
      console.warn('[Sidebar] Delete API failed, local update only')
    }
    onDeleteConversation?.(contextMenu.conv.id)
    setContextMenu(null)
  }

  async function handleMoveToProject(projectId) {
    if (!contextMenu) return
    // Optimistic UI update
    setConversations((prev) =>
      prev.map((c) => c.id === contextMenu.conv.id ? { ...c, projectId } : c),
    )
    try {
      await realMoveConversationToProject(contextMenu.conv.id, projectId)
    } catch {
      console.warn('[Sidebar] Move API failed, local update only')
    }
    setContextMenu(null)
  }

  // Default project colors — cycles through these for new projects
  const PROJECT_COLORS = ['#ff8c00', '#4a9eff', '#8b5cf6', '#6bcb8b', '#e85d75', '#f5c542']

  async function handleCreateProject() {
    const name = prompt('Project name:')
    if (!name || !name.trim()) return
    const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length]
    try {
      const result = await realCreateProject(name.trim(), color)
      setProjects((prev) => [...prev, { id: result.id, name: name.trim(), color, conversationCount: 0 }])
    } catch {
      console.warn('[Sidebar] Create project API failed')
    }
  }

  async function handleCreateProjectAndMove() {
    if (!contextMenu) return
    const name = prompt('New project name:')
    if (!name || !name.trim()) return
    const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length]
    try {
      const result = await realCreateProject(name.trim(), color)
      const newProject = { id: result.id, name: name.trim(), color, conversationCount: 1 }
      setProjects((prev) => [...prev, newProject])
      // Move the conversation into the new project
      setConversations((prev) =>
        prev.map((c) => c.id === contextMenu.conv.id ? { ...c, projectId: result.id } : c),
      )
      await realMoveConversationToProject(contextMenu.conv.id, result.id)
    } catch {
      console.warn('[Sidebar] Create project + move failed')
    }
    setContextMenu(null)
  }

  // Shared conversation item renderer
  function ConvoItem({ conv, projectId }) {
    return (
      <li key={conv.id}>
        <button
          className={`sidebar-item ${conv.id === activeConversationId ? 'sidebar-item-active' : ''}`}
          onClick={() => handleConvoClick(conv.id, projectId)}
          onContextMenu={(e) => handleContextMenu(e, conv)}
          aria-current={conv.id === activeConversationId ? 'true' : undefined}
        >
          <span className="sidebar-item-title">{conv.title}</span>
        </button>
      </li>
    )
  }

  // Search bar component
  function SearchBar() {
    if (collapsed) return null
    return (
      <div className="sidebar-search">
        <svg className="sidebar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="sidebar-search-input"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search conversations"
        />
        {search && (
          <button
            className="sidebar-search-clear"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  // ── Context menu ──────────────────────────────────────────────
  function ContextMenuPopup() {
    if (!contextMenu) return null
    return (
      <div
        ref={contextRef}
        className="sidebar-context-menu"
        style={{ top: contextMenu.y, left: contextMenu.x }}
        role="menu"
      >
        <button className="sidebar-context-item" onClick={handleRename} role="menuitem">
          Rename
        </button>
        <div className="sidebar-context-divider" />
        <div className="sidebar-context-label">Move to...</div>
        {contextMenu.conv.projectId && (
          <button
            className="sidebar-context-item"
            onClick={() => handleMoveToProject(null)}
            role="menuitem"
          >
            General
          </button>
        )}
        {realProjects
          .filter((p) => p.id !== contextMenu.conv.projectId)
          .map((p) => (
            <button
              key={p.id}
              className="sidebar-context-item"
              onClick={() => handleMoveToProject(p.id)}
              role="menuitem"
            >
              <span className="sidebar-project-dot" style={{ background: p.color }} aria-hidden="true" />
              {p.name}
            </button>
          ))}
        <button className="sidebar-context-item sidebar-context-new-project" onClick={handleCreateProjectAndMove} role="menuitem">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project...
        </button>
        <div className="sidebar-context-divider" />
        <button className="sidebar-context-item sidebar-context-danger" onClick={handleDelete} role="menuitem">
          Delete
        </button>
      </div>
    )
  }

  // ── Project detail view ──────────────────────────────────────
  if (viewingProject) {
    const proj = projects.find((p) => p.id === viewingProject)
    const buckets = groupByTime(projectConvos)

    return (
      <>
        {isOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}
        <nav className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`} aria-label="Project conversations">
          <div className="sidebar-collapse-toggle">
            <button onClick={toggleCollapse} className="sidebar-collapse-btn" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points={collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
              </svg>
            </button>
          </div>

          {!collapsed && (
            <>
              <div className="sidebar-header">
                <button className="sidebar-back-btn" onClick={() => setViewingProject(null)} aria-label="Back to all conversations">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back
                </button>
              </div>

              <div className="sidebar-project-detail-header">
                <span className="sidebar-project-dot-lg" style={{ background: proj?.color }} aria-hidden="true" />
                <h2 className="sidebar-project-detail-name">{proj?.name}</h2>
              </div>

              <button className="sidebar-new-btn sidebar-new-btn-inset" onClick={() => onNewConversation(viewingProject)} aria-label="Start new conversation in this project">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New conversation
              </button>

              <SearchBar />

              <div className="sidebar-scroll">
                {buckets.map(({ label, items }) => (
                  <div key={label} className="sidebar-time-group">
                    <div className="sidebar-time-label">{label}</div>
                    <ul className="sidebar-convo-list" role="list">
                      {items.map((conv) => <ConvoItem key={conv.id} conv={conv} projectId={viewingProject} />)}
                    </ul>
                  </div>
                ))}
                {projectConvos.length === 0 && (
                  <p className="sidebar-empty">{search ? 'No matches.' : 'No conversations yet.'}</p>
                )}
              </div>
            </>
          )}

          <div className="sidebar-footer">
            <SidebarFooter collapsed={collapsed} onOpenSettings={onOpenSettings} onOpenUpdates={onOpenUpdates} onOpenAbout={onOpenAbout} emberMascotImg={emberMascot} />
          </div>
        </nav>
        <ContextMenuPopup />
      </>
    )
  }

  // ── Main view ────────────────────────────────────────────────
  const timeBuckets = groupByTime(generalConvos)

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      <nav className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`} aria-label="Conversation history">
        <div className="sidebar-icon-row">
          {collapsed && (
            <button onClick={toggleCollapse} className="sidebar-icon-row-btn" aria-label="Expand sidebar" title="Expand sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
          <button className="sidebar-icon-row-btn" onClick={onNewConversation} aria-label="New conversation" title="New conversation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {collapsed && (
            <button className="sidebar-icon-row-btn" onClick={() => { setCollapsed(false); try { localStorage.setItem('ember-sidebar-collapsed', 'false') } catch {} setTimeout(() => document.querySelector('.sidebar-search-input')?.focus(), 300) }} aria-label="Search conversations" title="Search conversations">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          )}
          {!collapsed && (
            <button onClick={toggleCollapse} className="sidebar-icon-row-btn" aria-label="Collapse sidebar" title="Collapse sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>

        {!collapsed && (
          <>
            <SearchBar />

            <div className="sidebar-scroll">
              {/* Search results — flat list */}
              {search ? (
                <>
                  {filteredConvos.length > 0 ? (
                    <ul className="sidebar-convo-list" role="list">
                      {filteredConvos.map((conv) => <ConvoItem key={conv.id} conv={conv} projectId={conv.projectId} />)}
                    </ul>
                  ) : (
                    <p className="sidebar-empty">No matches.</p>
                  )}
                </>
              ) : (
                <>
                  {/* Projects section — always visible */}
                  <div className="sidebar-section">
                    <div className="sidebar-section-header">
                      <div className="sidebar-section-label">Projects</div>
                      <button
                        className="sidebar-section-add"
                        onClick={handleCreateProject}
                        aria-label="New project"
                        title="New project"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                    {realProjects.length > 0 ? (
                      <ul className="sidebar-convo-list" role="list">
                        {realProjects.map((proj) => {
                          const count = conversations.filter((c) => c.projectId === proj.id).length
                          return (
                            <li key={proj.id}>
                              <button
                                className={`sidebar-project-row ${activeProjectId === proj.id ? 'sidebar-project-row-active' : ''}`}
                                onClick={() => handleProjectClick(proj.id)}
                                aria-label={`${proj.name}, ${count} conversations`}
                              >
                                <span className="sidebar-project-dot" style={{ background: proj.color }} aria-hidden="true" />
                                <span className="sidebar-project-row-name">{proj.name}</span>
                                <span className="sidebar-project-count">{count}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="sidebar-project-arrow" aria-hidden="true">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="sidebar-empty sidebar-empty-sm">No projects yet. Click + to create one.</p>
                    )}
                  </div>

                  {/* Chronological general conversations */}
                  {timeBuckets.map(({ label, items }) => (
                    <div key={label} className="sidebar-time-group">
                      <div className="sidebar-time-label">{label}</div>
                      <ul className="sidebar-convo-list" role="list">
                        {items.map((conv) => <ConvoItem key={conv.id} conv={conv} />)}
                      </ul>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}

        <div className="sidebar-footer">
          {!collapsed && (
            <SidebarFooter collapsed={collapsed} onOpenSettings={onOpenSettings} onOpenUpdates={onOpenUpdates} onOpenAbout={onOpenAbout} emberMascotImg={emberMascot} />
          )}
        </div>
      </nav>
      <ContextMenuPopup />
    </>
  )
}

function SidebarFooter({ collapsed, onOpenSettings, onOpenUpdates, onOpenAbout, emberMascotImg }) {
  const [version, setVersion] = useState('')

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {})
  }, [])

  if (collapsed) return null
  return (
    <>
      <button className="sidebar-footer-btn" onClick={onOpenSettings} aria-label="Open settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        Settings
      </button>
      <button className="sidebar-brand" onClick={onOpenAbout} aria-label="About Ember">
        <img src={emberMascotImg} alt="" className="sidebar-brand-logo" aria-hidden="true" />
        <div className="sidebar-brand-info">
          <span className="sidebar-brand-name">Ember-2</span>
          <span className="sidebar-version">{version || '...'}</span>
        </div>
      </button>
    </>
  )
}
