/**
 * PinChange — modal flow for changing an existing PIN.
 *
 * Three-step wizard: verify → form → done.
 *   1. verify: user enters current PIN (pure UI state — not pre-verified
 *      against the backend to avoid an extra round-trip; the /pin/change
 *      endpoint re-verifies atomically at submit).
 *   2. form: user enters new PIN + confirmation.
 *   3. done: brief success state before onDone() closes the overlay.
 *
 * Triggered by the ember-show-pin-change event dispatched from Settings.
 * Reuses PinSetup.css so the visual language matches the setup flow.
 */
import { useState } from 'react'
import { changePin as apiChangePin } from '../../api/ember.js'
import emberMascot from '../../../assets/ember-mascot.png'
import './PinSetup.css'

export default function PinChange({ onDone, onCancel }) {
  const [step, setStep] = useState('verify') // verify, form, done
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleVerifyNext(e) {
    e.preventDefault()
    setError('')
    if (currentPin.length < 4) {
      setError('PIN must be at least 4 characters')
      return
    }
    setStep('form')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPin.length < 4) {
      setError('New PIN must be at least 4 characters')
      return
    }
    if (newPin !== confirmNewPin) {
      setError('New PINs do not match')
      return
    }
    if (newPin === currentPin) {
      setError('New PIN must be different from current PIN')
      return
    }

    setSaving(true)
    try {
      await apiChangePin(currentPin, newPin)
      setStep('done')
      setTimeout(() => onDone(), 1500)
    } catch (err) {
      // If the backend rejects the current PIN, send the user back to step 1
      // so they can re-enter it without also re-typing the new PIN twice.
      if (err.message === 'Current PIN is incorrect') {
        setStep('verify')
        setCurrentPin('')
      }
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="pin-setup-overlay" data-testid="pin-change-overlay">
        <div className="pin-setup-card">
          <img src={emberMascot} alt="Ember" className="pin-setup-logo" />
          <h2 className="pin-setup-title">PIN updated.</h2>
          <p className="pin-setup-text">
            Your new PIN is active. You'll use it the next time Ember locks.
          </p>
        </div>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div className="pin-setup-overlay" data-testid="pin-change-overlay">
        <div className="pin-setup-card pin-setup-card-form">
          <h2 className="pin-setup-title">Change your PIN</h2>
          <p className="pin-setup-text">Enter your current PIN to continue.</p>

          <form onSubmit={handleVerifyNext} className="pin-setup-form">
            <div className="pin-setup-group">
              <label className="pin-setup-label">Current PIN</label>
              <input
                type="password"
                className="pin-setup-input"
                data-testid="pin-change-current"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Enter current PIN"
                autoFocus
              />
            </div>

            {error && <p className="pin-setup-error">{error}</p>}

            <button type="submit" className="pin-setup-btn-primary">
              Next
            </button>
            <button type="button" className="pin-setup-btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </form>
        </div>
      </div>
    )
  }

  // step === 'form'
  return (
    <div className="pin-setup-overlay" data-testid="pin-change-overlay">
      <div className="pin-setup-card pin-setup-card-form">
        <h2 className="pin-setup-title">Set a new PIN</h2>

        <form onSubmit={handleSubmit} className="pin-setup-form">
          <div className="pin-setup-group">
            <label className="pin-setup-label">New PIN (4+ characters)</label>
            <input
              type="password"
              className="pin-setup-input"
              data-testid="pin-change-new"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Enter new PIN"
              autoFocus
            />
          </div>

          <div className="pin-setup-group">
            <label className="pin-setup-label">Confirm new PIN</label>
            <input
              type="password"
              className="pin-setup-input"
              data-testid="pin-change-confirm"
              value={confirmNewPin}
              onChange={(e) => setConfirmNewPin(e.target.value)}
              placeholder="Confirm new PIN"
            />
          </div>

          {error && <p className="pin-setup-error">{error}</p>}

          <button type="submit" className="pin-setup-btn-primary" disabled={saving} data-testid="pin-change-submit">
            {saving ? 'Updating…' : 'Update PIN'}
          </button>
          <button type="button" className="pin-setup-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  )
}
