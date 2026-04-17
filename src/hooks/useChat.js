/**
 * useChat — the core conversation engine.
 *
 * Owns message state, session tracking, streaming, and the
 * API-first / mock-fallback pattern. Every chat interaction
 * flows through here: send, regenerate, edit-and-resend, load
 * history, and stop.
 *
 * File attachments are split by type:
 *   • Images → base64 data URLs, sent inline via OpenAI multipart format
 *   • Documents → uploaded to /ingest/upload (vault ingestion path)
 *
 * Per-conversation options (bareMode, vaultEnabled) are stored in a
 * ref — not state — to avoid stale closures in the sendMessage callback.
 * The ref is cleared on new conversation and updated via setChatOptions.
 *
 * Returns: { messages, isStreaming, streamingStatus, sessionId,
 *            sendMessage, stopStreaming, clearMessages, loadConversation,
 *            regenerate, setProjectForNewConversation, setChatOptions,
 *            editAndResend }
 */
import { useState, useCallback, useRef } from 'react'
import { uuid } from '../utils/uuid.js'
import { mockStreamChat, mockGetMessages } from '../api/mock.js'
import {
  streamChat as realStreamChat,
  getConversationTurns as realGetConversationTurns,
  uploadDocument as realUploadDocument,
  moveConversationToProject as realMoveToProject,
} from '../api/ember.js'

/** Convert a File object to a base64 data URL for the vision API. */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

/**
 * useChat — manages message state, session tracking, and streaming responses.
 *
 * Tries the real Ember API first. Falls back to mock on failure.
 * Handles split file attachments: images go with chat, documents go to /ingest/upload.
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingStatus, setStreamingStatus] = useState(null)  // 'searching' | 'verifying' | 'refining' | 'analyzing' | null
  const [sessionId, setSessionId] = useState(() => generateSessionId())

  const abortRef = useRef(false)                // set true by stopStreaming to break the stream loop
  const apiAvailableRef = useRef(true)           // flips false on first API failure → mock fallback
  // Project assignment is deferred: the backend doesn't create the session
  // until the first message, so we hold the project ID in a ref and assign
  // after the first successful stream completes.
  const pendingProjectRef = useRef(null)         // project to assign once session exists
  const projectAssignedRef = useRef(false)       // prevents duplicate assignment calls
  // Ref, not state — avoids stale closure in sendMessage's useCallback.
  const chatOptionsRef = useRef({})              // per-conversation flags: { bareMode, vaultEnabled }

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

  /**
   * Send a message. Images ride inline (vision); documents go to vault first.
   * Streams the response token-by-token and stamps transparency indicators
   * (web search, vault, vision) from backend response headers.
   */
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

    // If documents were ingested, prepend context so Ember knows about them
    let enrichedText = text.trim()
    if (documents.length > 0) {
      const docNames = documents.map((d) => d.name).join(', ')
      enrichedText = `[I just uploaded ${docNames} to my vault. The content is now available in your memory.] ${enrichedText}`
    }

    // Convert image File objects to base64 data URLs for the API
    const imageDataUrls = await Promise.all(
      images.map((file) => fileToDataUrl(file))
    )

    const userMsg = {
      id: uuid(),
      role: 'user',
      content: enrichedText,
      files: images,
      imageDataUrls,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    if (imageDataUrls.length > 0) setStreamingStatus('analyzing')
    abortRef.current = false

    const assistantId = uuid()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
    ])

    try {
      // Rebuild the full conversation history for the API. We re-derive
      // from `messages` state (not the backend session) so edits and trims
      // are reflected. Images use the OpenAI vision multipart content format.
      const allMessages = [...messages, userMsg].map((m) => {
        if (m.imageDataUrls && m.imageDataUrls.length > 0) {
          const parts = [{ type: 'text', text: m.content || '' }]
          for (const dataUrl of m.imageDataUrls) {
            parts.push({ type: 'image_url', image_url: { url: dataUrl } })
          }
          return { role: m.role, content: parts }
        }
        return { role: m.role, content: m.content }
      })

      if (apiAvailableRef.current) {
        try {
          // Stream from real API — tokens arrive one at a time
          // streamChat returns transparency headers so the UI can show
          // indicators for web search, vault, and vision-grounded responses.
          const { stream, usedWebSearch, usedVault, usedVision } = await realStreamChat(allMessages, { sessionId, ...chatOptionsRef.current })
          if (usedWebSearch) {
            setStreamingStatus('searching')
          }
          for await (const chunk of stream) {
            if (abortRef.current) break
            // Status events: searching, verifying, refining
            if (chunk && typeof chunk === 'object' && chunk.type === 'status') {
              setStreamingStatus(chunk.content)
              continue
            }
            // Sources event: inline citations (web search)
            if (chunk && typeof chunk === 'object' && chunk.type === 'sources') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: chunk.sources } : m,
                ),
              )
              continue
            }
            // Vault sources event: citations from vault-grounded responses
            if (chunk && typeof chunk === 'object' && chunk.type === 'vault_sources') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, vaultSources: chunk.sources } : m,
                ),
              )
              continue
            }
            // Clear status once real content starts flowing
            setStreamingStatus(null)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m,
              ),
            )
          }
          // Mark transparency indicators after stream completes
          if (usedWebSearch) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, usedWebSearch: true } : m,
              ),
            )
          }
          if (usedVault) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, usedVault: true } : m,
              ),
            )
          }
          // vision attribution -- from header or inferred when images were sent
          if (usedVision || imageDataUrls.length > 0) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, usedVision: true } : m,
              ),
            )
          }
          // If this conversation was started from a project view, assign it to
          // that project now. Deferred to after streaming because the session ID
          // isn't created on the backend until the first message is sent.
          if (pendingProjectRef.current && !projectAssignedRef.current) {
            try {
              await realMoveToProject(sessionId, pendingProjectRef.current)
              projectAssignedRef.current = true
            } catch {}
          }
          return
        } catch {
          apiAvailableRef.current = false
          console.warn('[useChat] Real API unreachable, falling back to mock')
        }
      }

      // Mock fallback (also streams)
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
      setStreamingStatus(null)
    }
  }, [messages, isStreaming, sessionId])

  /** Signal the stream loop to stop after the current chunk. */
  const stopStreaming = useCallback(() => {
    abortRef.current = true
  }, [])

  /** Reset everything for a new conversation — fresh session, no project, no options. */
  const clearMessages = useCallback(() => {
    setMessages([])
    setSessionId(generateSessionId())
    pendingProjectRef.current = null
    projectAssignedRef.current = false
    chatOptionsRef.current = {}
  }, [])

  /** Merge per-conversation flags (bareMode, vaultEnabled) into the options ref. */
  const setChatOptions = useCallback((opts) => {
    chatOptionsRef.current = { ...chatOptionsRef.current, ...opts }
  }, [])

  /** Queue a project assignment for the next new conversation (deferred until session exists). */
  const setProjectForNewConversation = useCallback((projectId) => {
    pendingProjectRef.current = projectId || null
    projectAssignedRef.current = false
  }, [])

  /** Load an existing conversation's message history by ID (API-first, mock-fallback). */
  const loadConversation = useCallback(async (conversationId) => {
    try {
      const turns = await realGetConversationTurns(conversationId)
      // Defensive: backend occasionally returns non-array on empty conversations
      const mapped = (Array.isArray(turns) ? turns : []).map((t) => ({
        id: t.id || uuid(),
        role: t.role,
        content: t.content,
        timestamp: t.timestamp,
      }))
      setMessages(mapped)
      setSessionId(conversationId)
      return
    } catch {
      // Fall back to mock
    }
    const history = await mockGetMessages(conversationId)
    setMessages(history)
    setSessionId(conversationId)
  }, [])

  /**
   * Regenerate the last assistant response: trim back to the last user
   * message, discard the old answer, and re-stream a fresh one.
   * Intentionally separate from sendMessage to avoid re-triggering
   * document ingestion or image processing on regen.
   */
  const regenerate = useCallback(async () => {
    if (isStreaming) return
    // findLastIndex is ES2023 — intentional, we target modern browsers
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
          const { stream, usedWebSearch, usedVault, usedVision } = await realStreamChat(allMessages, { sessionId, ...chatOptionsRef.current })
          for await (const chunk of stream) {
            if (abortRef.current) break
            // Handle object events (vault_sources, sources, status) same as main path
            if (chunk && typeof chunk === 'object' && chunk.type === 'vault_sources') {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, vaultSources: chunk.sources } : m))
              continue
            }
            if (chunk && typeof chunk === 'object' && chunk.type === 'sources') {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, sources: chunk.sources } : m))
              continue
            }
            if (chunk && typeof chunk === 'object') continue // skip other object events
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m,
              ),
            )
          }
          if (usedWebSearch) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, usedWebSearch: true } : m,
              ),
            )
          }
          if (usedVault) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, usedVault: true } : m,
              ),
            )
          }
          if (usedVision) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, usedVision: true } : m,
              ),
            )
          }
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

  /** Edit a previous user message and resend — trims everything after it and re-sends. */
  const editAndResend = useCallback(async (messageId, newText) => {
    if (isStreaming) return

    // Find the message index, trim everything after it, resend with new text
    const msgIdx = messages.findIndex((m) => m.id === messageId)
    if (msgIdx === -1) return

    const trimmed = messages.slice(0, msgIdx)
    setMessages(trimmed)

    // Send the edited text as a new message
    await sendMessage(newText)
  }, [messages, isStreaming, sendMessage])

  return {
    messages,
    isStreaming,
    streamingStatus,
    sessionId,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadConversation,
    regenerate,
    setProjectForNewConversation,
    setChatOptions,
    editAndResend,
  }
}
