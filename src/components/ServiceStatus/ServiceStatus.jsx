/**
 * ServiceStatus -- header-bar API health indicator with service icons.
 *
 * Lives in the app header. Shows three icons (model type, search,
 * ask-first mode) alongside a status dot. Hover/tap expands a panel
 * with restart/shutdown controls.
 *
 * Status colors: green = healthy, amber = warning, red = down.
 * Polls GET /api/health every 15s.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { getServiceHealth, restartService, shutdownService } from '../../api/ember.js'
import './ServiceStatus.css'

const POLL_INTERVAL = 15000

// green/amber/red status mapping
function dotClass(status) {
  if (status === 'ok') return 'ss-dot-green'
  if (status === 'down') return 'ss-dot-red'
  return 'ss-dot-amber'
}

function statusLabel(status) {
  if (status === 'ok') return 'Healthy'
  if (status === 'down') return 'Unreachable'
  return 'Unknown'
}

function statusColor(status) {
  if (status === 'ok') return 'green'
  if (status === 'down') return 'red'
  return 'amber'
}

export default function ServiceStatus({ model, isCloudModel }) {
  const [health, setHealth] = useState({ api: 'unknown' })
  const [expanded, setExpanded] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [shuttingDown, setShuttingDown] = useState(false)
  const containerRef = useRef(null)
  const pollRef = useRef(null)

  const poll = useCallback(async () => {
    const result = await getServiceHealth()
    setHealth(result)
  }, [])

  // initial poll + interval
  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [poll])

  // close on outside click/tap
  useEffect(() => {
    if (!expanded) return
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpanded(false)
      }
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [expanded])

  async function handleRestart() {
    setRestarting(true)
    try {
      await restartService('api')
      setTimeout(poll, 2000)
    } catch {
      // next poll will update
    } finally {
      setRestarting(false)
    }
  }

  async function handleShutdown() {
    setShuttingDown(true)
    try {
      await shutdownService()
      setHealth({ api: 'down' })
    } catch {
      // next poll will update
    } finally {
      setShuttingDown(false)
    }
  }

  const color = statusColor(health.api)

  return (
    <div
      ref={containerRef}
      className={`ss-container ${expanded ? 'ss-expanded' : ''}`}
      data-testid="service-status"
    >
      {/* icon strip -- always visible in header */}
      <div
        className="ss-icons"
        role="button"
        tabIndex={0}
        aria-label={`Service status: ${statusLabel(health.api)}. Press Enter to expand.`}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        data-testid="service-dots"
      >
        {/* model type icon */}
        <span className={`ss-icon ss-icon-${color}`} title={model ? `Model: ${model}` : 'Model'}>
          {isCloudModel ? (
            // cloud icon for hosted models
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
            </svg>
          ) : (
            // cpu/local icon for local models
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" />
              <line x1="20" y1="14" x2="23" y2="14" />
              <line x1="1" y1="9" x2="4" y2="9" />
              <line x1="1" y1="14" x2="4" y2="14" />
            </svg>
          )}
        </span>

        {/* search icon */}
        <span className={`ss-icon ss-icon-${color}`} title="Search capability">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        {/* ask-first / question mark icon */}
        <span className={`ss-icon ss-icon-${color}`} title="Ask-first mode">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>

        {/* status dot */}
        <span
          className={`ss-dot ${dotClass(health.api)}`}
          data-testid="service-dot-api"
          aria-label={`API: ${statusLabel(health.api)}`}
        />
      </div>

      {/* expanded panel -- drops down from header */}
      {expanded && (
        <div className="ss-panel" data-testid="service-panel">
          <div className="ss-panel-row">
            <span className={`ss-dot-sm ${dotClass(health.api)}`} />
            <span className="ss-panel-label">API</span>
            <span className={`ss-panel-status ss-panel-status-${health.api}`}>
              {statusLabel(health.api)}
            </span>
            <button
              className="ss-restart-btn"
              onClick={handleRestart}
              disabled={restarting}
              aria-label="Restart API"
              title="Restart API"
              data-testid="service-restart-api"
            >
              {restarting ? (
                <span className="ss-spinner" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
              )}
            </button>
          </div>

          {model && (
            <div className="ss-panel-info">
              <span className="ss-panel-info-label">Model</span>
              <span className="ss-panel-info-value">{model}</span>
            </div>
          )}

          <button
            className="ss-shutdown-btn"
            onClick={handleShutdown}
            disabled={shuttingDown || health.api !== 'ok'}
            data-testid="service-shutdown"
          >
            {shuttingDown ? 'Stopping...' : 'Shut down Ember'}
          </button>
        </div>
      )}
    </div>
  )
}
