import { useState } from 'react'
import { mockSubmitBug } from '../../api/mock.js'
import { useModal } from '../../hooks/useModal.js'
import './BugReport.css'

export default function BugReport({ isOpen, onClose }) {
  const modalRef = useModal(isOpen, onClose)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)

    try {
      const res = await mockSubmitBug(title, description)
      setResult(res)
    } catch {
      setResult({ ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setTitle('')
    setDescription('')
    setResult(null)
    onClose()
  }

  return (
    <>
      <div className="bugreport-overlay" onClick={handleClose} aria-hidden="true" />
      <div ref={modalRef} className="bugreport-modal" role="dialog" aria-label="Report a bug" aria-modal="true">
        <div className="bugreport-header">
          <h2 className="bugreport-title">Report a Bug</h2>
          <button
            className="bugreport-close"
            onClick={handleClose}
            aria-label="Close bug report"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {result?.ok ? (
          <div className="bugreport-success">
            <p>Thanks — Ember got your report.</p>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bugreport-link"
            >
              View issue #{result.number}
            </a>
            <button className="bugreport-done-btn" onClick={handleClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="bugreport-form" onSubmit={handleSubmit}>
            <label className="bugreport-label" htmlFor="bug-title">
              Title
            </label>
            <input
              id="bug-title"
              type="text"
              className="bugreport-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              required
            />

            <label className="bugreport-label" htmlFor="bug-desc">
              Description
            </label>
            <textarea
              id="bug-desc"
              className="bugreport-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect to happen?"
              rows={5}
            />

            {result && !result.ok && (
              <p className="bugreport-error">Something went wrong. Please try again.</p>
            )}

            <div className="bugreport-actions">
              <button
                type="button"
                className="bugreport-cancel"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bugreport-submit"
                disabled={submitting || !title.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
