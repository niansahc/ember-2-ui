/**
 * ServiceStatus — persistent API health indicator.
 *
 * Fixed bottom-left corner (away from the send button). Collapsed: a
 * single small dot showing API status with a warm breathing glow when
 * healthy. Hover/tap: expands upward to show status text, a restart
 * button, and a shutdown button.
 *
 * Polls GET /api/health every 15s. Restart hits
 * POST /v1/service/api/restart. Shutdown hits POST /v1/service/shutdown.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { getServiceHealth, restartService, shutdownService } from '../../api/ember.js'
import './ServiceStatus.css'

const POLL_INTERVAL = 15000

function dotClass(status) {
  if (status === 'ok') return 'service-dot-ok'
  if (status === 'down') return 'service-dot-down'
  return 'service-dot-unknown'
}

function statusLabel(status) {
  if (status === 'ok') return 'Running'
  if (status === 'down') return 'Unreachable'
  return 'Unknown'
}

export default function ServiceStatus() {
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

  // Initial poll + interval
  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [poll])

  // Close on outside click/tap (mobile)
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
      // Re-poll after short delay for the service to come back
      setTimeout(poll, 2000)
    } catch {
      // Silently fail — next poll will update status
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
      // Even on error, next poll will update
    } finally {
      setShuttingDown(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`service-status ${expanded ? 'service-status-expanded' : ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      data-testid="service-status"
    >
      {/* Expanded panel — API only, no Docker */}
      {expanded && (
        <div className="service-panel" data-testid="service-panel">
          <div className="service-panel-row">
            <span className={`service-dot ${dotClass(health.api)}`} />
            <span className="service-panel-label">API</span>
            <span className={`service-panel-status service-panel-status-${health.api}`}>
              {statusLabel(health.api)}
            </span>
            <button
              className="service-restart-btn"
              onClick={handleRestart}
              disabled={restarting}
              aria-label="Restart API"
              title="Restart API"
              data-testid="service-restart-api"
            >
              {restarting ? (
                <span className="service-restart-spinner" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
              )}
            </button>
          </div>
          <button
            className="service-shutdown-btn"
            onClick={handleShutdown}
            disabled={shuttingDown || health.api !== 'ok'}
            data-testid="service-shutdown"
          >
            {shuttingDown ? 'Stopping...' : 'Shut down Ember'}
          </button>
        </div>
      )}

      {/* Collapsed: single API dot — keyboard-accessible */}
      <div
        className="service-dots"
        data-testid="service-dots"
        role="button"
        tabIndex={0}
        aria-label={`API status: ${statusLabel(health.api)}. Press Enter to expand.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
      >
        <span
          className={`service-dot ${dotClass(health.api)} ${health.api === 'ok' ? 'service-dot-breathe' : ''}`}
          data-testid="service-dot-api"
          aria-label={`API: ${statusLabel(health.api)}`}
        />
      </div>
    </div>
  )
}
