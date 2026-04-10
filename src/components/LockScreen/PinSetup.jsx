/**
 * PinSetup — first-run PIN + recovery passphrase creation flow.
 *
 * Three-step wizard: intro → form → done. Shown once for new users after the
 * guided tour completes. Can be dismissed ("Set up later") and re-triggered
 * from Settings.
 */
import { useState } from 'react'
import { setPin as apiSetPin } from '../../api/ember.js'
import emberMascot from '../../../assets/ember-mascot.png'
import './PinSetup.css'

export default function PinSetup({ onComplete, onSkip }) {
  const [step, setStep] = useState('intro') // intro, form, done
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Passphrase strength meter — thresholds encourage multi-word phrases:
  //   strong: 30+ chars AND 5+ words (a real passphrase, not a long password)
  //   ok:     20+ chars (meets minimum, but may be a single long string)
  //   weak:   anything shorter
  function passphraseStrength(p) {
    if (!p) return null
    const words = p.trim().split(/\s+/).length
    const len = p.length
    if (len >= 30 && words >= 5) return 'strong'
    if (len >= 20) return 'ok'
    return 'weak'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (pin.length < 4) {
      setError('PIN must be at least 4 characters')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    if (passphrase.length < 20) {
      setError('Recovery passphrase must be at least 20 characters')
      return
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match')
      return
    }

    setSaving(true)
    try {
      await apiSetPin(pin, passphrase)
      setStep('done')
      setTimeout(() => onComplete(), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'intro') {
    return (
      <div className="pin-setup-overlay">
        <div className="pin-setup-card">
          <img src={emberMascot} alt="Ember" className="pin-setup-logo" />
          <h2 className="pin-setup-title">Before you start, let's secure Ember.</h2>
          <p className="pin-setup-text">
            A PIN keeps your conversations private from anyone who shares this device or network.
          </p>
          <div className="pin-setup-buttons">
            <button className="pin-setup-btn-primary" onClick={() => setStep('form')}>
              Set up PIN
            </button>
            <button className="pin-setup-btn-secondary" onClick={onSkip}>
              Set up later
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="pin-setup-overlay">
        <div className="pin-setup-card">
          <img src={emberMascot} alt="Ember" className="pin-setup-logo" />
          <h2 className="pin-setup-title">You're all set.</h2>
          <p className="pin-setup-text">
            Ember is now protected. You'll need your PIN to unlock.
          </p>
        </div>
      </div>
    )
  }

  const strength = passphraseStrength(passphrase)

  return (
    <div className="pin-setup-overlay">
      <div className="pin-setup-card pin-setup-card-form">
        <h2 className="pin-setup-title">Set up your PIN</h2>

        <form onSubmit={handleSubmit} className="pin-setup-form">
          <div className="pin-setup-group">
            <label className="pin-setup-label">PIN (4+ characters)</label>
            <input
              type="password"
              className="pin-setup-input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              autoFocus
            />
          </div>

          <div className="pin-setup-group">
            <label className="pin-setup-label">Confirm PIN</label>
            <input
              type="password"
              className="pin-setup-input"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Confirm PIN"
            />
          </div>

          <div className="pin-setup-group">
            <label className="pin-setup-label">Recovery passphrase (20+ characters)</label>
            <input
              type="password"
              className="pin-setup-input"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="e.g. correct horse battery staple"
            />
            {strength && (
              <div className={`pin-setup-strength pin-setup-strength-${strength}`}>
                {strength === 'strong' ? 'Strong' : strength === 'ok' ? 'Acceptable' : 'Too short'}
              </div>
            )}
          </div>

          <div className="pin-setup-group">
            <label className="pin-setup-label">Confirm recovery passphrase</label>
            <input
              type="password"
              className="pin-setup-input"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="Confirm passphrase"
            />
          </div>

          <div className="pin-setup-warning">
            Your recovery passphrase is never stored in plain text anywhere on this device.
            If you forget it, your PIN cannot be recovered. Store it somewhere you control
            — a password manager, written down in a safe place.
          </div>

          {error && <p className="pin-setup-error">{error}</p>}

          <button type="submit" className="pin-setup-btn-primary" disabled={saving}>
            {saving ? 'Setting up...' : 'Confirm'}
          </button>
          <button type="button" className="pin-setup-btn-secondary" onClick={onSkip}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  )
}
