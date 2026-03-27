import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import emberMascot from '../../../assets/ember-mascot.png'
import './MessageBubble.css'

export default function MessageBubble({ message, isLast, onRegenerate, onEdit }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content)
  const editRef = useRef(null)

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editText.length, editText.length)
    }
  }, [editing])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  function handleStartEdit() {
    setEditText(message.content)
    setEditing(true)
  }

  function handleCancelEdit() {
    setEditing(false)
    setEditText(message.content)
  }

  function handleSubmitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== message.content && onEdit) {
      onEdit(message.id, trimmed)
    }
    setEditing(false)
  }

  function handleEditKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitEdit()
    }
    if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  function formatTime(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className={`bubble-row ${isUser ? 'bubble-row-user' : 'bubble-row-ember'}`}>
      {!isUser && (
        <img src={emberMascot} alt="Ember" className="bubble-avatar" />
      )}
      <div className="bubble-wrap">
        <div
          className={`bubble ${isUser ? 'bubble-user' : 'bubble-ember'}`}
          role="article"
          aria-label={`${isUser ? 'You' : 'Ember'} said`}
        >
          {isUser && editing ? (
            <div className="bubble-edit">
              <textarea
                ref={editRef}
                className="bubble-edit-textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                rows={2}
                aria-label="Edit message"
              />
              <div className="bubble-edit-actions">
                <button className="bubble-edit-cancel" onClick={handleCancelEdit}>Cancel</button>
                <button className="bubble-edit-save" onClick={handleSubmitEdit}>Send</button>
              </div>
            </div>
          ) : isUser ? (
            <p className="bubble-text">{message.content}</p>
          ) : (
            <div className="bubble-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || '\u200B'}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Actions bar — visible on hover */}
        {!editing && (
          <div className="bubble-actions">
            <span className="bubble-timestamp" title={message.timestamp}>
              {formatTime(message.timestamp)}
            </span>
            {isUser && onEdit && (
              <button
                className="bubble-action-btn"
                onClick={handleStartEdit}
                aria-label="Edit message"
                title="Edit"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            <button
              className="bubble-action-btn"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy message'}
              title={copied ? 'Copied!' : 'Copy'}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
            {!isUser && isLast && onRegenerate && (
              <button
                className="bubble-action-btn"
                onClick={onRegenerate}
                aria-label="Regenerate response"
                title="Regenerate"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 105.26-11.49L1 10" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
