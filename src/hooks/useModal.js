import { useEffect, useRef, useCallback } from 'react'

/**
 * useModal — handles Escape key dismissal and focus trapping for modals.
 *
 * Usage:
 *   const modalRef = useModal(isOpen, onClose)
 *   <div ref={modalRef} ...>
 */
export function useModal(isOpen, onClose) {
  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus management: move focus into modal on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      // rAF defers the query to the next paint — React may not have flushed
      // DOM updates by the time this effect fires synchronously.
      requestAnimationFrame(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          )
          if (focusable) focusable.focus()
        }
      })
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null  // prevent holding a stale DOM reference
    }
  }, [isOpen])

  // Focus trap: keep Tab cycling within modal
  useEffect(() => {
    if (!isOpen) return

    function handleTab(e) {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableEls = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusableEls.length === 0) return

      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  return modalRef
}
