/**
 * Chat — the main conversation view.
 *
 * Renders the message list, auto-scrolls on new content, shows a
 * typing indicator during streaming, and hosts the InputBar at the
 * bottom. The scroll-to-bottom button appears when the user scrolls
 * up past a threshold so they can jump back down.
 */
import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import MessageBubble from './MessageBubble.jsx'
import InputBar from './InputBar.jsx'
import emberMascot from '../../../assets/ember-mascot.png'
import { getGreeting, extractFirstName } from '../../utils/greeting.js'
import './Chat.css'

// Maps streaming status codes from the backend to user-facing labels.
// These show next to the typing dots so the user knows what Ember is doing.
const STATUS_LABELS = {
  searching: 'Searching the web\u2026',
  verifying: 'Verifying\u2026',
  refining: 'Refining\u2026',
  analyzing: 'Analyzing image\u2026',
}

export default function Chat({ messages, isStreaming, streamingStatus, onSend, onStop, onRegenerate, onEdit, userName, hasOnboarded }) {
  const scrollRef = useRef(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  // Compute the session greeting ONCE per hasOnboarded/userName transition.
  // useMemo (not useState) because prefs load asynchronously — Chat often
  // mounts before hasOnboarded flips true. A lazy useState initializer
  // would lock in null forever; useMemo recomputes when deps change.
  // First-time users (!hasOnboarded) see the static Welcome copy; the
  // personalized time-of-day greeting is only for returning users.
  const greeting = useMemo(
    () => (hasOnboarded ? getGreeting({ name: extractFirstName(userName) }) : null),
    [hasOnboarded, userName],
  )

  // Auto-scroll to bottom whenever messages change (new message or streaming chunk)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Show the "scroll to bottom" fab when the user is more than ~120px
  // from the bottom — enough to mean they scrolled up intentionally.
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

  // Walk backward to find the last assistant message — only that message
  // gets the regenerate button and "isLast" styling. Memoized on messages
  // so streaming-chunk re-renders don't re-scan the full thread each frame.
  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i
    }
    return -1
  }, [messages])

  return (
    <div className="chat">
      <div
        className="chat-messages"
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Conversation"
      >
        {/* ── Empty state — shown before the first message ─────────
           First-time users (pre-onboarding) see the stable Welcome
           copy that introduces Ember. Returning users get a time-of-
           day greeting in Ember's voice, varied per session, with
           the user's first name ~40% of the time. */}
        {messages.length === 0 && (
          <div className="chat-empty">
            <img src={emberMascot} alt="" className="chat-empty-logo" aria-hidden="true" />
            {greeting ? (
              <>
                <h2 className="chat-empty-title">{greeting.title}</h2>
                {greeting.subtitle && (
                  <p className="chat-empty-text">{greeting.subtitle}</p>
                )}
              </>
            ) : (
              <>
                <h2 className="chat-empty-title">Hi, I'm Ember.</h2>
                <p className="chat-empty-text">
                  Ask me anything, write a journal entry, or just tell me what's on your mind.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Message list ── */}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={i === lastAssistantIdx && !isStreaming}
            onRegenerate={i === lastAssistantIdx && !isStreaming ? onRegenerate : undefined}
            onEdit={!isStreaming ? onEdit : undefined}
          />
        ))}

        {/* ── Typing indicator — visible while Ember is streaming ── */}
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

      {/* ── Scroll-to-bottom fab ── */}
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
