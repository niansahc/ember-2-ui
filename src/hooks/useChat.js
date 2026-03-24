import { useState, useCallback, useRef } from 'react'
import { mockStreamChat, mockGetMessages } from '../api/mock.js'
import {
  sendChat as realSendChat,
  getConversation as realGetConversation,
} from '../api/ember.js'

/**
 * useChat — manages message state, session tracking, and streaming responses.
 *
 * Tries the real Ember API first. Falls back to mock on failure.
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState(() => generateSessionId())
  const abortRef = useRef(false)
  const apiAvailableRef = useRef(true)

  function generateSessionId() {
    return `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }

  const sendMessage = useCallback(async (text, files = []) => {
    if (!text.trim() && files.length === 0) return
    if (isStreaming) return

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      files,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    abortRef.current = false

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
    ])

    try {
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      if (apiAvailableRef.current) {
        // Try real API (non-streaming for now since backend doesn't stream yet)
        try {
          const reply = await realSendChat(allMessages, { sessionId })
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: reply } : m,
            ),
          )
          return
        } catch {
          // Real API failed — fall back to mock
          apiAvailableRef.current = false
          console.warn('[useChat] Real API unreachable, falling back to mock')
        }
      }

      // Mock fallback — streaming simulation
      for await (const chunk of mockStreamChat(allMessages)) {
        if (abortRef.current) break
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        )
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.' }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
    }
  }, [messages, isStreaming, sessionId])

  const stopStreaming = useCallback(() => {
    abortRef.current = true
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setSessionId(generateSessionId())
  }, [])

  const loadConversation = useCallback(async (conversationId) => {
    // Try real API first
    try {
      const data = await realGetConversation(conversationId)
      const turns = (data.turns || []).map((t) => ({
        id: t.id || crypto.randomUUID(),
        role: t.role,
        content: t.content,
        timestamp: t.timestamp,
      }))
      setMessages(turns)
      setSessionId(conversationId)
      return
    } catch {
      // Fall back to mock
    }

    // Mock fallback
    const history = await mockGetMessages(conversationId)
    setMessages(history)
    setSessionId(conversationId)
  }, [])

  const regenerate = useCallback(async () => {
    if (isStreaming) return
    const lastUserIdx = messages.findLastIndex((m) => m.role === 'user')
    if (lastUserIdx === -1) return
    const trimmed = messages.slice(0, lastUserIdx + 1)
    setMessages(trimmed)

    setIsStreaming(true)
    abortRef.current = false

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
    ])

    try {
      const allMessages = trimmed.map((m) => ({ role: m.role, content: m.content }))

      if (apiAvailableRef.current) {
        try {
          const reply = await realSendChat(allMessages, { sessionId })
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: reply } : m,
            ),
          )
          return
        } catch {
          apiAvailableRef.current = false
        }
      }

      for await (const chunk of mockStreamChat(allMessages)) {
        if (abortRef.current) break
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.' }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
    }
  }, [messages, isStreaming, sessionId])

  return {
    messages,
    isStreaming,
    sessionId,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadConversation,
    regenerate,
  }
}
