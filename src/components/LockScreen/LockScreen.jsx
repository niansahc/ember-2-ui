import { useState } from 'react'
import { verifyPin, recoverPin } from '../../api/ember.js'
import emberMascot from '../../../assets/ember-mascot.png'
import './LockScreen.css'

export default function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState(null)
  const [locked, setLocked] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)

  // Recovery state
  const [recoveryPhrase, setRecoveryPhrase] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoverySuccess, setRecoverySuccess] = useState(false)

  async function handleUnlock(e) {
    e.preventDefault()
    if (!pin.trim() || locked) return

    const result = await verifyPin(pin)
    if (result.valid) {
      onUnlock()
      return
    }

    if (result.locked) {
      setLocked(true)
      setError('Too many attempts. Try again in 5 minutes.')
      return
    }

    setPin('')
    setError('Incorrect PIN')
    setShake(true)
    setTimeout(() => setShake(false), 500)

    if (result.remaining_attempts !== undefined) {
      setRemainingAttempts(result.remaining_attempts)
    }
  }

  async function handleRecover(e) {
    e.preventDefault()
    setRecoveryError('')

    if (newPin !== confirmPin) {
      setRecoveryError('PINs do not match')
      return
    }
    if (newPin.length < 4) {
      setRecoveryError('PIN must be at least 4 characters')
      return
    }

    try {
      await recoverPin(recoveryPhrase, newPin)
      setRecoverySuccess(true)
      setTimeout(() => {
        setShowRecovery(false)
        setRecoverySuccess(false)
        setPin('')
        setError('')
        setRemainingAttempts(null)
        setLocked(false)
      }, 1500)
    } catch (err) {
      setRecoveryError(err.message)
    }
  }

  if (showRecovery) {
    return (
      <div className="lock-overlay">
        <div className="lock-card">
          <img src={emberMascot} alt="Ember" className="lock-logo" />
          <h2 className="lock-title">Recover access</h2>

          {recoverySuccess ? (
            <p className="lock-success">PIN updated. Returning to login.</p>
          ) : (
            <form onSubmit={handleRecover} className="lock-form">
              <input
                type="password"
                className="lock-input"
                placeholder="Recovery passphrase"
                value={recoveryPhrase}
                onChange={(e) => setRecoveryPhrase(e.target.value)}
                autoFocus
              />
              <input
                type="password"
                className="lock-input"
                placeholder="New PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
              <input
                type="password"
                className="lock-input"
                placeholder="Confirm new PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
              {recoveryError && <p className="lock-error">{recoveryError}</p>}
              <button type="submit" className="lock-btn">Reset PIN</button>
              <button type="button" className="lock-link" onClick={() => setShowRecovery(false)}>
                Back to unlock
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="lock-overlay">
      <div className={`lock-card ${shake ? 'lock-shake' : ''}`}>
        <img src={emberMascot} alt="Ember" className="lock-logo" />
        <h2 className="lock-title">Ember is locked</h2>

        <form onSubmit={handleUnlock} className="lock-form">
          <input
            type="password"
            className="lock-input"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            disabled={locked}
            autoFocus
            aria-label="PIN"
          />
          {error && <p className="lock-error">{error}</p>}
          {remainingAttempts !== null && remainingAttempts <= 3 && !locked && (
            <p className="lock-attempts">{remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining</p>
          )}
          <button type="submit" className="lock-btn" disabled={locked || !pin.trim()}>
            Unlock
          </button>
        </form>

        <button className="lock-link" onClick={() => setShowRecovery(true)}>
          Forgot PIN?
        </button>
      </div>
    </div>
  )
}
