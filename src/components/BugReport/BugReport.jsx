/**
 * BugReport — modal that opens a pre-filled GitHub Issue in the browser.
 * No data is sent from Ember — the user files the bug on GitHub directly.
 * useModal handles focus trapping and Escape-to-close.
 */
import { useModal } from '../../hooks/useModal.js'
import './BugReport.css'

export default function BugReport({ isOpen, onClose }) {
  const modalRef = useModal(isOpen, onClose)

  if (!isOpen) return null

  return (
    <>
      <div className="bugreport-overlay" onClick={onClose} aria-hidden="true" />
      <div ref={modalRef} className="bugreport-modal" role="dialog" aria-label="Report a bug" aria-modal="true">
        <div className="bugreport-header">
          <h2 className="bugreport-title">
            Report a Bug
            <span className="bugreport-info-icon" tabIndex={0} role="button" aria-label="Privacy information">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span className="bugreport-info-tooltip">
                This opens GitHub Issues in your browser. You write and submit the report directly on GitHub — Ember does not send any data on your behalf.
              </span>
            </span>
          </h2>
          <button
            className="bugreport-close"
            onClick={onClose}
            aria-label="Close bug report"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="bugreport-body">
          <p className="bugreport-text">
            Found something wrong? Let us know on GitHub.
          </p>
          <a
            href="https://github.com/niansahc/ember-2/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="bugreport-github-link"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Open GitHub Issues
          </a>
        </div>
      </div>
    </>
  )
}
