import { useEffect, useRef, useCallback } from 'react'

/**
 * Fires onIdle after `minutes` of inactivity (no mouse, keyboard, or messages).
 * Returns a resetTimer function to call when activity occurs.
 */
export function useIdleTimeout(minutes, onIdle, enabled = true) {
  const timerRef = useRef(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (enabled && minutes > 0) {
      timerRef.current = setTimeout(onIdle, minutes * 60 * 1000)
    }
  }, [minutes, onIdle, enabled])

  useEffect(() => {
    if (!enabled || minutes <= 0) return

    function handleActivity() {
      resetTimer()
    }

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('touchstart', handleActivity)

    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [minutes, enabled, resetTimer])

  return resetTimer
}
