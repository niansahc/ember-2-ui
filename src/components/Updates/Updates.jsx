import { useState, useEffect } from 'react'
import { mockCheckUpdate } from '../../api/mock.js'
import { checkUpdate as realCheckUpdate } from '../../api/ember.js'
import { useModal } from '../../hooks/useModal.js'
import './Updates.css'

export default function Updates({ isOpen, onClose }) {
  const modalRef = useModal(isOpen, onClose)
  const [checking, setChecking] = useState(false)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (isOpen && !info) {
      checkNow()
    }
  }, [isOpen])

  async function checkNow() {
    setChecking(true)
    try {
      let result
      try {
        result = await realCheckUpdate('v0.9.1')
      } catch {
        console.warn('[Updates] Real API failed, using mock')
        result = await mockCheckUpdate()
      }
      setInfo(result)
    } catch {
      setInfo({ error: true })
    } finally {
      setChecking(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="updates-overlay" onClick={onClose} aria-hidden="true" />
      <div ref={modalRef} className="updates-modal" role="dialog" aria-label="Updates" aria-modal="true">
        <div className="updates-header">
          <h2 className="updates-title">Updates</h2>
          <button
            className="updates-close"
            onClick={onClose}
            aria-label="Close updates"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="updates-body">
          {checking && (
            <div className="updates-checking">
              <div className="updates-spinner" aria-hidden="true" />
              <p>Checking for updates...</p>
            </div>
          )}

          {info && !info.error && !info.hasUpdate && (
            <div className="updates-current">
              <div className="updates-version-badge">
                <span className="updates-version">{info.current}</span>
                <span className="updates-label">Current version</span>
              </div>
              <p className="updates-uptodate">Ember is up to date.</p>
              <button className="updates-recheck" onClick={checkNow}>
                Check again
              </button>
            </div>
          )}

          {info && info.hasUpdate && (
            <div className="updates-available">
              <div className="updates-version-row">
                <div className="updates-version-badge">
                  <span className="updates-version">{info.current}</span>
                  <span className="updates-label">Installed</span>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
                <div className="updates-version-badge updates-version-new">
                  <span className="updates-version">{info.latest}</span>
                  <span className="updates-label">Available</span>
                </div>
              </div>

              {info.changelog && (
                <div className="updates-changelog">
                  <h3 className="updates-changelog-title">What's new</h3>
                  <div className="updates-changelog-text">{info.changelog}</div>
                </div>
              )}

              <button className="updates-update-btn">
                Update Ember
              </button>
            </div>
          )}

          {info?.error && (
            <div className="updates-error">
              <p>Couldn't check for updates. Are you online?</p>
              <button className="updates-recheck" onClick={checkNow}>
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
