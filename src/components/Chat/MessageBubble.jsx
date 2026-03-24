import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import emberMascot from '../../../assets/ember-mascot.png'
import './MessageBubble.css'

export default function MessageBubble({ message, isLast, onRegenerate }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
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
          {isUser ? (
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
        <div className="bubble-actions">
          <span className="bubble-timestamp" title={message.timestamp}>
            {formatTime(message.timestamp)}
          </span>
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
      </div>
    </div>
  )
}
