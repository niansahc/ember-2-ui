import { useEffect, useState } from 'react'
import { checkConnection } from '../../api/ember.js'
import { mockCheckConnection } from '../../api/mock.js'
import emberMascot from '../../../assets/ember-mascot.png'
import './Splash.css'

export default function Splash({ onConnected }) {
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        // Try real API first
        const result = await checkConnection()
        if (cancelled) return
        if (result.ok) {
          setStatus('connected')
          setTimeout(() => onConnected(result.model), 600)
          return
        }
        // Real API returned not ok — try mock fallback
        const mock = await mockCheckConnection()
        if (cancelled) return
        if (mock.ok) {
          setStatus('connected')
          setTimeout(() => onConnected(mock.model), 600)
          return
        }
        setStatus('error')
        setError("Ember isn't running. Start the API and refresh.")
      } catch {
        if (cancelled) return
        setStatus('error')
        setError("Ember isn't running. Start the API and refresh.")
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
