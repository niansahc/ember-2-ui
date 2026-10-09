/**
 * useChat — the core conversation engine.
 *
 * Owns message state, session tracking, and streaming. Every chat
 * interaction flows through here: send, regenerate, edit-and-resend,
 * load history, and stop.
 *
 * There is no mock fallback. There used to be: when the real API failed,
 * this hook quietly streamed canned text from api/mock.js and rendered it as
 * Ember's reply, including invented journal entries and invented web search
 * results, with only a console.warn to show for it. A model server that
 * stopped overnight was enough to trigger it. Failures now surface as a
 * visible error turn instead. Nothing fabricated reaches the transcript.
 * See ADR 0003.
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
import { chatErrorMessage, CONVERSATION_LOAD_ERROR } from '../utils/chatError.js'
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
 * Handles split file attachments: images go with chat, documents go to /ingest/upload.
 *
 * @param {{model?: string|null}} opts  `model` is the active model id, passed
 *   down from App (which already holds it from the Splash /api/health
 *   handshake). It is used only to name the right provider in error copy, so
 *   a null value degrades to provider-neutral wording rather than breaking.
 */
export function useChat({ model = null } = {}) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingStatus, setStreamingStatus] = useState(null)  // 'searching' | 'verifying' | 'refining' | 'analyzing' | null
  const [sessionId, setSessionId] = useState(() => generateSessionId())

  const abortRef = useRef(false)                // set true by stopStreaming to break the stream loop
  // Deliberately no apiAvailableRef. It used to latch false on the first
  // failure and was never reset, so one blip downgraded the entire session to
  // fabricated replies until the page was reloaded. Every send now attempts
  // the network. A genuinely dead backend costs one failed request per send,
  // which is the price of telling the truth.
  // Project assignment is deferred: the backend doesn't create the session
  // until the first message, so we hold the project ID in a ref and assign
  // after the first successful stream completes.
  const pendingProjectRef = useRef(null)         // project to assign once session exists
  const projectAssignedRef = useRef(false)       // prevents duplicate assignment calls
  // Ref, not state — avoids stale closure in sendMessage's useCallback.
  const chatOptionsRef = useRef({})              // per-conversation flags: { bareMode, vaultEnabled }
  // Bumped by anything that changes which conversation is on screen. A
  // conversation load only applies its response if the counter hasn't moved
  // since it started, so a slow load for A can't paint over B (or over a new
  // chat) that the user picked while A was still in flight.
  const loadSeqRef = useRef(0)
  // The in-flight stream, if any: which session it belongs to, a promise that
  // settles when it ends, and that promise's resolver. loadConversation waits
  // on `done`. See there. Streams never overlap (sendMessage and regenerate
  // both bail while isStreaming), so one slot is enough.
  const activeStreamRef = useRef(null)          // { sessionId, done, end } | null

  /** Register a stream as in flight. Returns the function that ends it. */
  function beginStream(streamSessionId) {
    let end
    const done = new Promise((resolve) => { end = resolve })
    activeStreamRef.current = { sessionId: streamSessionId, done, end }
    return () => {
      activeStreamRef.current = null
      end()
    }
  }

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
   * Replace a pending assistant turn with a visible error.
   *
   * `isError: true` is what marks this as UI-authored rather than something
   * Ember said. Two things key off it: MessageBubble renders the error variant
   * with a Try again button and no copy affordance, and toApiHistory drops it
   * before the next request so the model never sees our words as its own.
   */
  function markMessageFailed(assistantId, text) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: text, isError: true }
          : m,
      ),
    )
  }

  /**
   * Handle an SSE error frame (ADR-040 v3). Two cases, kept deliberately apart:
   *
   * - Nothing streamed yet: the placeholder becomes the error turn, same as a
   *   failed request.
   * - Tokens already streamed: those are Ember's words, so they stay in a
   *   normal Ember bubble. The frame's message goes in a *separate* error turn
   *   below. Folding them into one error bubble would label real model output
   *   "Ember could not respond" and render it as UI text (ADR 0003, both ways).
   *
   * The frame's `code` never gets here; ember.js strips it at the parser.
   */
  function handleErrorFrame(assistantId, message) {
    setMessages((prev) => {
      const target = prev.find((m) => m.id === assistantId)
      if (!target || !target.content) {
        return prev.map((m) =>
          m.id === assistantId ? { ...m, content: message, isError: true } : m,
        )
      }
      return [
        ...prev,
        {
          id: uuid(),
          role: 'assistant',
          content: message,
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]
    })
  }

  /**
   * Build the message list sent to the API.
   *
   * Error turns are filtered out here. They are UI-authored text, so feeding
   * them back would have Ember reading "I can't reach my backend right now" as
   * something she said and potentially referring to it later. That is a milder
   * version of the same fabrication problem, pointed the other way.
   */
  function toApiHistory(list) {
    return list
      .filter((m) => !m.isError)
      .map((m) => {
        if (m.imageDataUrls && m.imageDataUrls.length > 0) {
          const parts = [{ type: 'text', text: m.content || '' }]
          for (const dataUrl of m.imageDataUrls) {
            parts.push({ type: 'image_url', image_url: { url: dataUrl } })
          }
          return { role: m.role, content: parts }
        }
        return { role: m.role, content: m.content }
      })
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

    loadSeqRef.current += 1   // sending here means this conversation is the one the user wants
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    const endStream = beginStream(sessionId)
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
      const allMessages = toApiHistory([...messages, userMsg])

      // Stream from real API — tokens arrive one at a time
      // streamChat returns transparency headers so the UI can show
      // indicators for web search, vault, and vision-grounded responses.
      const { stream, usedWebSearch, usedVault, usedVision } = await realStreamChat(allMessages, { sessionId, ...chatOptionsRef.current })
      if (usedWebSearch) {
        setStreamingStatus('searching')
      }
      let hasVaultSources = false
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
          hasVaultSources = true
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, vaultSources: chunk.sources } : m,
            ),
          )
          continue
        }
        // Error frame: stream terminated with an error. Tokens already
        // rendered stay; the message surfaces as its own error turn.
        if (chunk && typeof chunk === 'object' && chunk.type === 'error') {
          handleErrorFrame(assistantId, chunk.message)
          break
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
      // Vault badge: derive from vault_sources frame on streaming, fallback to header on non-streaming
      const vaultBadge = hasVaultSources || usedVault
      if (vaultBadge) {
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
        // Retry once, then give up. A single retry covers a transient blip
        // (the session was only just created server-side, so the very first
        // PATCH can race the write) without spiralling into a queue — if the
        // backend is genuinely down, two tries in a row is plenty to know it.
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            await realMoveToProject(sessionId, pendingProjectRef.current)
            projectAssignedRef.current = true
            break
          } catch (err) {
            if (attempt === 2) {
              console.warn('[useChat] Project assignment failed after retry:', err)
            }
          }
        }
      }
    } catch (err) {
      // A user-initiated abort is not a failure. stopStreaming uses abortRef
      // rather than an AbortSignal today, but streamChat re-throws AbortError
      // untouched, so guard here in case a signal is ever wired through.
      if (err?.name === 'AbortError') return
      console.warn('[useChat] Chat request failed:', err)
      markMessageFailed(assistantId, chatErrorMessage(err, model))
    } finally {
      setIsStreaming(false)
      setStreamingStatus(null)
      endStream()
    }
  }, [messages, isStreaming, sessionId, model])

  /** Signal the stream loop to stop after the current chunk. */
  const stopStreaming = useCallback(() => {
    abortRef.current = true
  }, [])

  /** Reset everything for a new conversation — fresh session, no project, no options. */
  const clearMessages = useCallback(() => {
    loadSeqRef.current += 1   // a load still in flight is for a conversation we just left
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

  /**
   * Load an existing conversation's message history by ID.
   *
   * On failure this shows an error turn rather than inventing a transcript.
   * The old mock fallback was worse here than on the reply path: fabricated
   * history reads as the user's own past conversations, not as one bad answer.
   * The copy is provider-neutral because reading stored turns never touches
   * the model provider.
   *
   * Never rejects. Pass `onNotFound` to own the 404 case yourself: it's
   * called instead of painting the error turn. Session restore uses that,
   * because a saved conversation that was deleted isn't a failure worth
   * announcing on boot. It's a cue to go back to a blank chat.
   *
   * Loads requested mid-stream fetch right away but wait for the stream to
   * end before applying. Applying them
   * immediately put the new conversation under the old stream's typing
   * indicator and Stop button, with the reply streaming into a message that
   * was no longer on screen. Re-selecting the conversation that is streaming
   * is a no-op: local state already holds the in-flight exchange, and the
   * backend only writes turns after it emits [DONE], so a reload would come
   * back without it and the reply would vanish.
   */
  const loadConversation = useCallback(async (conversationId, { onNotFound } = {}) => {
    const seq = ++loadSeqRef.current
    const isStale = () => seq !== loadSeqRef.current
    const inFlight = activeStreamRef.current
    if (inFlight && inFlight.sessionId === conversationId) {
      await inFlight.done
      return
    }
    // Kick the fetch off now; only the apply waits for an in-flight stream,
    // so the network time overlaps the rest of the reply.
    const request = realGetConversationTurns(conversationId)
    // While we sit on inFlight.done nobody is awaiting `request` yet, so a
    // fast failure would surface as an unhandled rejection. The real handling
    // is the try/catch below; this just marks it as observed.
    request.catch(() => {})
    if (inFlight) await inFlight.done
    try {
      const turns = await request
      if (isStale()) return
      // getConversationTurns already throws on a non-array, so map directly.
      const mapped = turns.map((t) => ({
        id: t.id || uuid(),
        role: t.role,
        content: t.content,
        timestamp: t.timestamp,
        // Count only; the API never returns image bytes. Missing/invalid -> 0.
        imageCount: Number.isInteger(t.image_count) && t.image_count > 0 ? t.image_count : 0,
      }))
      setMessages(mapped)
      setSessionId(conversationId)
    } catch (err) {
      if (isStale()) return   // a newer selection owns the screen; don't stamp an error on it
      if (err?.status === 404 && onNotFound) {
        onNotFound()
        return
      }
      console.warn('[useChat] Conversation load failed:', err)
      setMessages([
        {
          id: uuid(),
          role: 'assistant',
          content: CONVERSATION_LOAD_ERROR,
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ])
      setSessionId(conversationId)
    }
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
    const endStream = beginStream(sessionId)
    abortRef.current = false

    const assistantId = uuid()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
    ])

    try {
      const allMessages = toApiHistory(trimmed)

      const { stream, usedWebSearch, usedVault, usedVision } = await realStreamChat(allMessages, { sessionId, ...chatOptionsRef.current })
      let hasVaultSources = false
      for await (const chunk of stream) {
        if (abortRef.current) break
        // Handle object events (vault_sources, sources, status) same as main path
        if (chunk && typeof chunk === 'object' && chunk.type === 'status') {
          continue
        }
        if (chunk && typeof chunk === 'object' && chunk.type === 'vault_sources') {
          hasVaultSources = true
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, vaultSources: chunk.sources } : m))
          continue
        }
        if (chunk && typeof chunk === 'object' && chunk.type === 'sources') {
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, sources: chunk.sources } : m))
          continue
        }
        if (chunk && typeof chunk === 'object' && chunk.type === 'error') {
          handleErrorFrame(assistantId, chunk.message)
          break
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
      const vaultBadge = hasVaultSources || usedVault
      if (vaultBadge) {
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
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.warn('[useChat] Regenerate failed:', err)
      markMessageFailed(assistantId, chatErrorMessage(err, model))
    } finally {
      setIsStreaming(false)
      endStream()
    }
  }, [messages, isStreaming, sessionId, model])

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
