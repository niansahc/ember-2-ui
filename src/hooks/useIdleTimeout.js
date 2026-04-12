import { useEffect, useRef, useCallback } from 'react'

/**
 * Fires onIdle after `minutes` of inactivity.
 *
 * Uses two listeners — pointerdown (covers mouse + touch in one event)
 * and keydown (covers keyboard). A 1-second debounce prevents rapid-fire
 * resetTimer calls from high-frequency events like mouse drags. The old
 * implementation used 4 raw listeners (mousemove, keydown, click,
 * touchstart) with no debounce, causing measurable overhead on high-DPI
 * displays where mousemove fires hundreds of times per second.
 */
export function useIdleTimeout(minutes, onIdle, enabled = true) {
  const timerRef = useRef(null)
  const debounceRef = useRef(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (enabled && minutes > 0) {
      timerRef.current = setTimeout(onIdle, minutes * 60 * 1000)
    }
  }, [minutes, onIdle, enabled])

  useEffect(() => {
    if (!enabled || minutes <= 0) return

    // Debounced activity handler — fires resetTimer at most once per second.
    // Prevents cascading resets from rapid pointer or keyboard events.
    function handleActivity() {
      if (debounceRef.current) return
      debounceRef.current = setTimeout(() => { debounceRef.current = null }, 1000)
      resetTimer()
    }

    // pointerdown: covers mouse click, touch tap, pen tap — one listener
    // instead of separate click + touchstart + mousemove.
    // keydown: covers keyboard activity.
    // Both passive — we never preventDefault on these.
    window.addEventListener('pointerdown', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity, { passive: true })

    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      window.removeEventListener('pointerdown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
    }
  }, [minutes, enabled, resetTimer])

  return resetTimer
}
