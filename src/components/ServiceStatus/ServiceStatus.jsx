/**
 * ServiceStatus — persistent service health indicator.
 *
 * Fixed bottom-right corner. Collapsed: two tiny dots (API + Docker)
 * with a warm breathing glow when healthy. Hover/tap: expands upward
 * to show service labels, status text, and per-service restart buttons.
 *
 * Polls GET /api/health every 15s. G is adding a `docker` field to the
 * response. Restart hits POST /v1/service/{name}/restart (also G).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { getServiceHealth, restartService, shutdownService } from '../../api/ember.js'
import './ServiceStatus.css'

const POLL_INTERVAL = 15000

const SERVICES = [
  { key: 'api', label: 'API' },
  { key: 'docker', label: 'Docker' },
]

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
  const [health, setHealth] = useState({ api: 'unknown', docker: 'unknown' })
  const [expanded, setExpanded] = useState(false)
  const [restarting, setRestarting] = useState({}) // { api: true } while in-flight
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

  async function handleRestart(name) {
    setRestarting((prev) => ({ ...prev, [name]: true }))
    try {
      await restartService(name)
      // Re-poll after short delay for the service to come back
      setTimeout(poll, 2000)
    } catch {
      // Silently fail — next poll will update status
    } finally {
      setRestarting((prev) => ({ ...prev, [name]: false }))
    }
  }

  async function handleShutdown() {
    setShuttingDown(true)
    try {
      await shutdownService()
      // API is stopping — force both dots dark immediately
      setHealth({ api: 'down', docker: 'unknown' })
    } catch {
      // Even on error, next poll will update
    } finally {
      setShuttingDown(false)
    }
  }

  const allOk = health.api === 'ok' && health.docker === 'ok'
  const allDown = health.api !== 'ok' && health.docker !== 'ok'

  return (
    <div
      ref={containerRef}
      className={`service-status ${expanded ? 'service-status-expanded' : ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      data-testid="service-status"
    >
      {/* Expanded panel */}
      {expanded && (
        <div className="service-panel" data-testid="service-panel">
          {SERVICES.map((svc) => (
            <div className="service-panel-row" key={svc.key}>
              <span className={`service-dot ${dotClass(health[svc.key])}`} />
              <span className="service-panel-label">{svc.label}</span>
              <span className={`service-panel-status service-panel-status-${health[svc.key]}`}>
                {statusLabel(health[svc.key])}
              </span>
              <button
                className="service-restart-btn"
                onClick={() => handleRestart(svc.key)}
                disabled={restarting[svc.key]}
                aria-label={`Restart ${svc.label}`}
                title={`Restart ${svc.label}`}
                data-testid={`service-restart-${svc.key}`}
              >
                {restarting[svc.key] ? (
                  <span className="service-restart-spinner" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                  </svg>
                )}
              </button>
            </div>
          ))}
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

      {/* Collapsed dots */}
      <div className="service-dots" data-testid="service-dots">
        {SERVICES.map((svc) => (
          <span
            key={svc.key}
            className={`service-dot ${dotClass(health[svc.key])} ${health[svc.key] === 'ok' ? 'service-dot-breathe' : ''}`}
            data-testid={`service-dot-${svc.key}`}
            aria-label={`${svc.label}: ${statusLabel(health[svc.key])}`}
          />
        ))}
      </div>
    </div>
  )
}
