/**
 * ServiceStatus -- header-bar API health dot with dropdown panel.
 *
 * Single colored dot: green = healthy, amber = warning, red = down.
 * Click/tap expands a panel with status, restart, and shutdown.
 * Polls GET /api/health every 15s.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { getServiceHealth, restartService, shutdownService } from '../../api/ember.js'
import './ServiceStatus.css'

const POLL_INTERVAL = 15000

function dotClass(status) {
  if (status === 'ok') return 'ss-dot-green'
  if (status === 'slow') return 'ss-dot-amber'
  if (status === 'down') return 'ss-dot-red'
  return 'ss-dot-amber'
}

function statusLabel(status) {
  if (status === 'ok') return 'Healthy'
  if (status === 'slow') return 'Slow'
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
  const failCountRef = useRef(0)

  const poll = useCallback(async () => {
    const result = await getServiceHealth()
    if (result.api === 'ok') {
      failCountRef.current = 0
      setHealth(result)
    } else {
      failCountRef.current += 1
      setHealth({
        ...result,
        api: failCountRef.current >= 2 ? 'down' : 'slow',
      })
    }
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

  return (
    <div
      ref={containerRef}
      className={`ss-container ${expanded ? 'ss-expanded' : ''}`}
      data-testid="service-status"
    >
      {/* health dot -- always visible */}
      <button
        className="ss-dot-btn"
        onClick={() => setExpanded((v) => !v)}
        title={`API: ${statusLabel(health.api)}`}
        aria-label={`Service status: ${statusLabel(health.api)}. Click to expand.`}
        data-testid="service-dots"
      >
        <span
          className={`ss-dot ${dotClass(health.api)}`}
          data-testid="service-dot-api"
        />
      </button>

      {/* dropdown panel */}
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

          <button
            className="ss-shutdown-btn"
            onClick={handleShutdown}
            disabled={shuttingDown || health.api === 'down'}
            data-testid="service-shutdown"
          >
            {shuttingDown ? 'Stopping...' : 'Shut down Ember'}
          </button>
        </div>
      )}
    </div>
  )
}
