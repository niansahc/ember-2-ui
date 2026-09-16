/**
 * TextPromptModal — in-app replacement for window.prompt().
 *
 * Sidebar used the browser's native prompt() for renaming a conversation and
 * naming a new project, which looks like a browser alert rather than part of
 * Ember and skips the app's own dialog convention. This is a single reusable
 * modal for all three call sites (rename conversation, create project,
 * create-project-and-move) — they're structurally identical: one text field,
 * an optional prefilled value, Cancel/Confirm. useModal handles Escape,
 * focus trap, and focus restore, same as BugReport.
 *
 * Behavioral parity with prompt(): Cancel, Escape, or clicking the overlay
 * all call onCancel with nothing further happening (prompt() returning
 * null). Submitting calls onConfirm(value) with the raw input value —
 * callers keep their existing "empty/whitespace is a no-op" guard.
 */
import { useState, useEffect, useRef } from 'react'
import { useModal } from '../../hooks/useModal.js'
import './TextPromptModal.css'

export default function TextPromptModal({
  isOpen,
  title,
  label,
  defaultValue = '',
  confirmLabel = 'OK',
  onConfirm,
  onCancel,
}) {
  const modalRef = useModal(isOpen, onCancel)
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef(null)

  // Reset to the caller's default each time the modal opens (it may be
  // reused across different rename targets without unmounting).
  useEffect(() => {
    if (isOpen) setValue(defaultValue)
  }, [isOpen, defaultValue])

  useEffect(() => {
    if (!isOpen) return
    requestAnimationFrame(() => inputRef.current?.select())
  }, [isOpen])

  if (!isOpen) return null

  function handleSubmit(e) {
    e.preventDefault()
    onConfirm(value)
  }

  return (
    <>
      <div className="text-prompt-overlay" onClick={onCancel} aria-hidden="true" />
      <div ref={modalRef} className="text-prompt-modal" role="dialog" aria-label={title} aria-modal="true">
        <form onSubmit={handleSubmit}>
          <h2 className="text-prompt-title">{title}</h2>
          {label && <label className="text-prompt-label" htmlFor="text-prompt-input">{label}</label>}
          <input
            id="text-prompt-input"
            ref={inputRef}
            type="text"
            className="text-prompt-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <div className="text-prompt-actions">
            <button type="button" className="text-prompt-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="text-prompt-btn text-prompt-btn-confirm">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
