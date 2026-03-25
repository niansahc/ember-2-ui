import { useState, useCallback, useRef } from 'react'
import { uuid } from '../utils/uuid.js'
import { mockStreamChat, mockGetMessages } from '../api/mock.js'
import {
  sendChat as realSendChat,
  getConversation as realGetConversation,
  uploadDocument as realUploadDocument,
} from '../api/ember.js'

/**
 * useChat — manages message state, session tracking, and streaming responses.
 *
 * Tries the real Ember API first. Falls back to mock on failure.
 * Handles split file attachments: images go with chat, documents go to /ingest/upload.
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState(() => generateSessionId())
  const abortRef = useRef(false)
  const apiAvailableRef = useRef(true)

  function generateSessionId() {
    return `sess_${uuid().replace(/-/g, '').slice(0, 16)}`
  }

  /**
   * Add a system-style message from Ember (not from the LLM — UI-injected).
   */
  function addEmberMessage(text) {
    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
      },
    ])
  }

  const sendMessage = useCallback(async (text, { images = [], documents = [] } = {}) => {
    if (!text.trim() && images.length === 0 && documents.length === 0) return
    if (isStreaming) return

    // --- Ingest documents first ---
    for (const doc of documents) {
      addEmberMessage(`Uploading **${doc.name}** to your vault...`)

      try {
        const result = await realUploadDocument(doc)
        if (result.status === 'ingested') {
          setMessages((prev) => {
            const updated = [...prev]
            // Replace the "uploading" message with success
            const lastIdx = updated.length - 1
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: `I've added **${result.filename}** to your vault (${result.chunks} chunks). You can ask me about it now.`,
            }
            return updated
          })
        }
      } catch (err) {
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `I couldn't process **${doc.name}**: ${err.message}`,
          }
          return updated
        })
      }
    }

    // If only documents were attached with no text, we're done
    if (!text.trim() && images.length === 0) return

    const userMsg = {
      id: uuid(),
      role: 'user',
      content: text.trim(),
      files: images,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    abortRef.current = false

    const assistantId = uuid()
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
          console.warn('[useChat] Real API unreachable, falling back to mock')
        }
      }

      // Mock fallback
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
    try {
      const data = await realGetConversation(conversationId)
      const turns = (data.turns || []).map((t) => ({
        id: t.id || uuid(),
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

    const assistantId = uuid()
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
