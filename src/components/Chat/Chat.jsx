import { useRef, useEffect, useState, useCallback } from 'react'
import MessageBubble from './MessageBubble.jsx'
import InputBar from './InputBar.jsx'
import emberMascot from '../../../assets/ember-mascot.png'
import './Chat.css'

const STATUS_LABELS = {
  searching: 'Searching the web\u2026',
  verifying: 'Verifying\u2026',
  refining: 'Refining\u2026',
}

export default function Chat({ messages, isStreaming, streamingStatus, onSend, onStop, onRegenerate, onEdit }) {
  const scrollRef = useRef(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Track scroll position for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120)
  }, [])

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }

  // Find last assistant message index
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i
    }
    return -1
  })()

  return (
    <div className="chat">
      <div
        className="chat-messages"
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Conversation"
      >
        {messages.length === 0 && (
          <div className="chat-empty">
            <img src={emberMascot} alt="" className="chat-empty-logo" aria-hidden="true" />
            <h2 className="chat-empty-title">Hi, I'm Ember.</h2>
            <p className="chat-empty-text">
              Ask me anything, write a journal entry, or just tell me what's on your mind.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={i === lastAssistantIdx && !isStreaming}
            onRegenerate={i === lastAssistantIdx && !isStreaming ? onRegenerate : undefined}
            onEdit={!isStreaming ? onEdit : undefined}
          />
        ))}
        {isStreaming && (
          <div className="chat-typing" aria-live="polite" aria-label={STATUS_LABELS[streamingStatus] || 'Ember is typing'}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            {streamingStatus && STATUS_LABELS[streamingStatus] && (
              <span className="chat-status-label">{STATUS_LABELS[streamingStatus]}</span>
            )}
          </div>
        )}
      </div>

      {showScrollBtn && (
        <button
          className="chat-scroll-btn"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      <InputBar onSend={onSend} isStreaming={isStreaming} onStop={onStop} />
    </div>
  )
}
