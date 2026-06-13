/**
 * useTransientError — per-key error messages that wipe themselves after a beat.
 *
 * Extracted from the Sidebar task-error idiom so every optimistic mutation in
 * the app can fail the same way: roll the state back, then `setError(id, msg)`
 * to flash a short "couldn't do that" on the offending row. The message
 * auto-clears after `timeout` ms so a stale failure never lingers — nobody
 * wants yesterday's "couldn't save" still glaring at them.
 *
 * Keyed by id (task id, conversation id, whatever) so multiple rows can each
 * carry their own error at once without stepping on each other.
 *
 * Returns { errors, setError, clearError } where `errors` is { [id]: message }.
 */
import { useState, useRef, useCallback, useEffect } from 'react'

export function useTransientError(timeout = 4000) {
  const [errors, setErrors] = useState({})
  // id -> timeout handle, so re-erroring the same row resets its countdown
  // instead of stacking timers that race to clear it.
  const timers = useRef({})

  const clearError = useCallback((key) => {
    if (timers.current[key]) {
      clearTimeout(timers.current[key])
      delete timers.current[key]
    }
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const setError = useCallback((key, message) => {
    setErrors((prev) => ({ ...prev, [key]: message }))
    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      delete timers.current[key]
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }, timeout)
  }, [timeout])

  // Sweep any pending timers on unmount — no setState-after-unmount warnings.
  useEffect(() => {
    const pending = timers.current
    return () => {
      Object.values(pending).forEach(clearTimeout)
    }
  }, [])

  return { errors, setError, clearError }
}
