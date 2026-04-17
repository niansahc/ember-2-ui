/**
 * Splash — the first screen. Probes the backend, shows the mascot
 * with a pulse animation while connecting, then transitions to the app.
 * API-first / mock-fallback pattern: tries the real backend, falls back
 * to mock data if it's unreachable (lets the UI render in dev without G).
 */
import { useEffect, useState } from 'react'
import { checkConnection, hasApiKey } from '../../api/ember.js'
import { mockCheckConnection } from '../../api/mock.js'
import emberMascot from '../../../assets/ember-mascot.png'
import './Splash.css'

export default function Splash({ onConnected }) {
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)
  const [missingKey, setMissingKey] = useState(false)

  useEffect(() => {
    // Guard against setState on an unmounted component if the user navigates away
    let cancelled = false

    async function check() {
      try {
        // Try real API first
        const result = await checkConnection()
        if (cancelled) return
        if (result.ok) {
          setStatus('connected')
          // 200ms is enough to flash "Ready." without feeling sluggish.
          // Was 600ms — cut per v0.15.0 performance audit.
          setTimeout(() => onConnected(result.model), 200)
          return
        }
        // Real API returned not ok — try mock fallback
        const mock = await mockCheckConnection()
        if (cancelled) return
        if (mock.ok) {
          setStatus('connected')
          setTimeout(() => onConnected(mock.model), 200)
          return
        }
        setStatus('error')
        if (!hasApiKey) {
          setMissingKey(true)
          setError('API key not configured')
        } else {
          setError("Ember isn't running. Start the API and refresh.")
        }
      } catch {
        if (cancelled) return
        setStatus('error')
        if (!hasApiKey) {
          setMissingKey(true)
          setError('API key not configured')
        } else {
          setError("Ember isn't running. Start the API and refresh.")
        }
      }
    }

    check()
    return () => { cancelled = true }
  }, [onConnected])

  return (
    <div className="splash" role="status" aria-live="polite">
      <img
        src={emberMascot}
        alt="Ember"
        className={`splash-logo ${status === 'connecting' ? 'pulse' : ''}`}
      />
      {status === 'connecting' && (
        <p className="splash-text">Connecting to Ember...</p>
      )}
      {status === 'connected' && (
        <p className="splash-text splash-ready">Ready.</p>
      )}
      {status === 'error' && (
        <div className="splash-error">
          <p className="splash-text splash-error-text">{error}</p>
          {missingKey && (
            <div className="splash-key-help">
              <p>To get started, add your API key to the <code>.env</code> file:</p>
              <code className="splash-code-block">VITE_EMBER_API_KEY=your_key</code>
              <p className="splash-key-hint">
                Run <code>python scripts/set_api_key.py</code> in the ember-2 repo to generate a key,
                or find it in Windows Credential Manager under <code>ember-2 / api_key</code>.
              </p>
            </div>
          )}
          <button
            className="splash-retry"
            onClick={() => window.location.reload()}
            aria-label="Retry connection"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
