import { useState, useRef, useEffect, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import emberMascot from '../../../assets/ember-mascot.png'
import { parseEmberTimestamp } from '../../utils/parseTimestamp.js'
import './MessageBubble.css'

/**
 * Turn a vault source record into a human-friendly citation string.
 * G sends { type, timestamp, summary } — we want something warm and
 * readable like "Based on a conversation from March 15" rather than
 * raw metadata. Falls back to the summary if type is unexpected.
 */
function formatVaultSource(src) {
  const typeLabels = {
    conversation: 'a conversation',
    reflection: 'a reflection',
    journal: 'a journal entry',
    state: 'a state record',
    ingested: 'an imported document',
    lodestone: 'a lodestone record',
  }
  const label = typeLabels[src.type] || src.summary || 'a memory'
  if (src.timestamp) {
    try {
      const date = new Date(src.timestamp.replace(/-/g, (m, i) => i > 9 ? ':' : m))
      if (!isNaN(date)) {
        const formatted = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
        return `Based on ${label} from ${formatted}`
      }
    } catch { /* fall through */ }
  }
  return `Based on ${label}`
}

/**
 * Determine the unified source label for a message.
 * Composes attribution strings from backend execution-state headers.
 * Zero sources → returns null so the badge is suppressed entirely
 * (identity-style responses handle attribution in their text).
 */
function sourceLabel(msg) {
  const parts = []
  if (msg.usedVision) parts.push('Vision')
  if (msg.usedWebSearch) parts.push('Web Search')
  if (msg.usedFirstPartySource) parts.push('From your memory')
  if (msg.usedThirdPartySource) parts.push('From your library')
  // Legacy vault flag — only surface when backend hasn't classified authorship,
  // to avoid double-labelling responses that already carry the new badges.
  if (msg.usedVault && !msg.usedFirstPartySource && !msg.usedThirdPartySource) {
    parts.push('Vault')
  }
  return parts.length > 0 ? parts.join(' + ') : null
}

// React.memo — prevents re-render when sibling messages update.
// Each bubble only re-renders when its own message object changes.
export default memo(function MessageBubble({ message, isLast, onRegenerate, onEdit }) {
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
    const d = parseEmberTimestamp(iso)
    if (!d) return ''
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    if (isToday) return time
    const sameYear = d.getFullYear() === now.getFullYear()
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    if (sameYear) return `${date}, ${time}`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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
            <>
              {message.imageDataUrls && message.imageDataUrls.length > 0 && (
                <div className="bubble-images">
                  {message.imageDataUrls.map((url, i) => (
                    <img key={i} src={url} alt={`Uploaded image ${i + 1}`} className="bubble-image-thumb" />
                  ))}
                </div>
              )}
              <p className="bubble-text">{message.content}</p>
            </>
          ) : (
            <div className="bubble-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {message.content || '\u200B'}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Unified source label — one line showing where the response drew from.
            Replaces the old separate web search magnifying glass and vault dot.
            Suppressed entirely for zero-hit responses (identity queries, plain LLM). */}
        {!isUser && sourceLabel(message) && (
          <div className="bubble-source-label" aria-label={`Source: ${sourceLabel(message)}`} data-testid="bubble-source-label">
            <span className="bubble-source-label-key">Source:</span>{' '}
            <span className="bubble-source-label-value" data-testid="bubble-source-value">{sourceLabel(message)}</span>
          </div>
        )}

        {/* Vault source citations — "Based on a conversation from March 15" etc. */}
        {!isUser && message.vaultSources && message.vaultSources.length > 0 && (
          <div className="bubble-vault-sources" aria-label="Vault sources" data-testid="bubble-vault-sources">
            {message.vaultSources.slice(0, 5).map((src, i) => (
              <span key={i} className="bubble-vault-source">
                {i > 0 && <span className="bubble-sources-sep"> · </span>}
                {formatVaultSource(src)}
              </span>
            ))}
          </div>
        )}

        {/* Inline source citations (web search) — suppress entirely when
            no sources have meaningful content (url + title both required) */}
        {!isUser && message.sources && message.sources.filter((s) => s.url && s.title).length > 0 && (
          <div className="bubble-sources" aria-label="Sources">
            <span className="bubble-sources-label">Sources:</span>
            {message.sources.filter((s) => s.url && s.title).slice(0, 5).map((src, i) => (
              <span key={i}>
                {i > 0 && <span className="bubble-sources-sep"> · </span>}
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bubble-source-link"
                >
                  {src.title}
                </a>
              </span>
            ))}
          </div>
        )}

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
}) // end memo(MessageBubble)
