import { useEffect, useRef } from 'react'
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'
import { getPreferences, updatePreferences } from '../api/ember.js'

/**
 * Guided first-run tour. Shows once for new users, never again.
 * Uses Shepherd.js for step-by-step walkthrough.
 * Completion stored in vault preferences (first_run_tour_complete: true).
 */
export function useTour(isReady) {
  const tourRef = useRef(null)

  useEffect(() => {
    if (!isReady) return

    let cancelled = false

    async function maybeStartTour() {
      try {
        const prefs = await getPreferences()
        if (prefs.first_run_tour_complete) return
        if (cancelled) return

        // Delay to let UI settle
        await new Promise((r) => setTimeout(r, 1000))
        if (cancelled) return

        const tour = new Shepherd.Tour({
          useModalOverlay: true,
          defaultStepOptions: {
            scrollTo: false,
            cancelIcon: { enabled: false },
            classes: 'ember-tour-step',
          },
        })
        tourRef.current = tour

        tour.addStep({
          id: 'welcome',
          text: "Welcome to Ember. This is your private, local AI \u2014 everything stays on your machine. Let\u2019s take a quick look around.",
          attachTo: { element: '.sidebar-brand', on: 'right' },
          buttons: [
            { text: 'Skip tour', action: tour.cancel, classes: 'ember-tour-skip' },
            { text: 'Next', action: tour.next, classes: 'ember-tour-next' },
          ],
        })

        tour.addStep({
          id: 'conversations',
          text: "Your conversations live here. Ember remembers context across sessions \u2014 she builds on what you\u2019ve talked about before.",
          attachTo: { element: '.sidebar-scroll', on: 'right' },
          buttons: [
            { text: 'Back', action: tour.back, classes: 'ember-tour-back' },
            { text: 'Next', action: tour.next, classes: 'ember-tour-next' },
          ],
        })

        tour.addStep({
          id: 'projects',
          text: "Group related conversations into projects. Ember boosts context from the active project when you\u2019re working in it.",
          attachTo: { element: '.sidebar-section-header', on: 'right' },
          buttons: [
            { text: 'Back', action: tour.back, classes: 'ember-tour-back' },
            { text: 'Next', action: tour.next, classes: 'ember-tour-next' },
          ],
        })

        tour.addStep({
          id: 'tasks',
          text: "Ask Ember to create tasks and they\u2019ll appear here. Check them off when done \u2014 they clear at the end of the day.",
          attachTo: { element: '.sidebar-tasks', on: 'right' },
          // If no tasks exist, fall back to the footer area
          beforeShowPromise: () => {
            return new Promise((resolve) => {
              const el = document.querySelector('.sidebar-tasks')
              if (!el) {
                // Re-attach to footer if no tasks section visible
                const step = tour.getCurrentStep()
                step.updateStepOptions({
                  attachTo: { element: '.sidebar-footer', on: 'right' },
                  text: "When you ask Ember to create tasks, they\u2019ll appear here in the sidebar. Check them off when done.",
                })
              }
              resolve()
            })
          },
          buttons: [
            { text: 'Back', action: tour.back, classes: 'ember-tour-back' },
            { text: 'Next', action: tour.next, classes: 'ember-tour-next' },
          ],
        })

        tour.addStep({
          id: 'settings',
          text: "Control your models, conversational style, web search, and privacy settings here.",
          attachTo: { element: '.sidebar-footer-btn', on: 'right' },
          buttons: [
            { text: 'Back', action: tour.back, classes: 'ember-tour-back' },
            { text: 'Next', action: tour.next, classes: 'ember-tour-next' },
          ],
        })

        tour.addStep({
          id: 'done',
          text: "That\u2019s it. Start talking to Ember \u2014 she\u2019ll get to know you over time. Your data stays yours.",
          attachTo: { element: '.input-bar', on: 'top' },
          buttons: [
            { text: 'Back', action: tour.back, classes: 'ember-tour-back' },
            { text: 'Done', action: tour.complete, classes: 'ember-tour-next' },
          ],
        })

        function markComplete() {
          updatePreferences({ first_run_tour_complete: true }).catch(() => {})
        }

        tour.on('complete', markComplete)
        tour.on('cancel', markComplete)

        tour.start()
      } catch {}
    }

    maybeStartTour()

    return () => {
      cancelled = true
      if (tourRef.current) {
        tourRef.current.cancel()
        tourRef.current = null
      }
    }
  }, [isReady])
}
