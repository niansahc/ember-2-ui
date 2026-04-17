/**
 * InputBar — the message composer at the bottom of the chat view.
 *
 * Handles text input, file attachments (images + documents), and the
 * send/stop toggle. The submit button pulls double duty: it sends when
 * idle and stops generation when streaming.
 *
 * File routing matters here:
 *   - Images → sent inline with the message (vision path)
 *   - Documents → ingested into the vault (retrieval path)
 * The hint text below each chip tells the user which path their file takes.
 */
import { useState, useRef, useCallback } from 'react'
import './InputBar.css'

// Accepted MIME types for inline image attachments (vision-capable).
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// File extensions routed to vault ingestion instead of inline vision.
const DOC_EXTENSIONS = ['.pdf', '.docx', '.csv', '.xlsx', '.txt']

/**
 * Classify a File object for routing: images go inline, documents go
 * to the vault, anything else is rejected as "unknown."
 */
function classifyFile(file) {
  if (IMAGE_TYPES.includes(file.type)) return 'image'
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (DOC_EXTENSIONS.includes(ext)) return 'document'
  return 'unknown'
}

export default function InputBar({ onSend, isStreaming, onStop }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])       // attached files awaiting send
  const inputRef = useRef(null)                 // textarea — refocused after send
  const fileRef = useRef(null)                  // hidden <input type="file">

  /**
   * Submit handler — dual-purpose button:
   *   • While streaming → stop generation
   *   • While idle → send message + attachments
   * After sending, clears the input and re-focuses the textarea.
   */
  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    // During streaming the button becomes a stop button
    if (isStreaming) {
      onStop()
      return
    }
    if (!text.trim() && files.length === 0) return
    // Split attachments by type — images ride inline, docs go to vault
    const images = files.filter((f) => classifyFile(f) === 'image')
    const documents = files.filter((f) => classifyFile(f) === 'document')
    onSend(text, { images, documents })
    setText('')
    setFiles([])
    inputRef.current?.focus()
  }, [text, files, isStreaming, onSend, onStop])

  // Enter sends, Shift+Enter inserts a newline
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Append newly selected files; reset the input value so re-selecting
  // the same file still triggers onChange (browser quirk).
  function handleFileChange(e) {
    const selected = Array.from(e.target.files)
    setFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form className="input-bar" onSubmit={handleSubmit}>
      {/* ── File chips — previews of attached files ── */}
      {files.length > 0 && (
        <div className="input-files" role="list" aria-label="Attached files">
          {files.map((f, i) => {
            const kind = classifyFile(f)
            return (
              <div key={i} className={`input-file-chip input-file-chip-${kind}`} role="listitem">
                {/* Images get a thumbnail; documents get a file icon */}
                {kind === 'image' ? (
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    className="input-file-thumb"
                  />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="input-file-icon" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
                <div className="input-file-info">
                  <span className="input-file-name">{f.name}</span>
                  {/* Routing hint: images travel with the message, docs go to vault */}
                  <span className="input-file-hint">
                    {kind === 'image' ? 'Sent with your message' : 'Added to your vault'}
                  </span>
                </div>
                <button
                  type="button"
                  className="input-file-remove"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                >
                  &times;
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Compose row — attach, textarea, send/stop ── */}
      <div className="input-row">
        <button
          type="button"
          className="input-attach"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach file"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input type="file" ref={fileRef} className="sr-only" onChange={handleFileChange} multiple accept=".pdf,.docx,.csv,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp" />
        <textarea
          ref={inputRef}
          className="input-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Talk to Ember..."
          rows={1}
          aria-label="Message input"
        />
        {/* Send/stop toggle — same button, different icon + aria label */}
        <button
          type="submit"
          className={`input-send ${isStreaming ? 'input-stop' : ''}`}
          aria-label={isStreaming ? 'Stop generating' : 'Send message'}
        >
          {isStreaming ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}
