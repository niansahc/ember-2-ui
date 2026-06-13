import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockStreamChat, mockGetProjects } from './mock.js'

// The full EMBER_RESPONSES pool, duplicated here as the expected contract.
// mock.js does not export it, so we assert behavior against this known list.
// If the pool changes, this fixture must change with it — that coupling is
// intentional: the test guards the exact streamed output.
const EMBER_RESPONSES = [
  "I've been thinking about what you shared earlier. There's a pattern forming here that I think is worth exploring together.",
  "That's an interesting question. Let me pull from what I know about you and think through this carefully.\n\nBased on your recent journal entries, I notice you've been circling back to this theme of **balance** — between deep focus and the need for variety.\n\nHere's what I'd suggest:\n\n1. Block your mornings for the deep work\n2. Use afternoons for exploratory tasks\n3. Keep a running list of \"sparks\" — ideas that excite you but don't need action yet\n\nWould you like me to help you structure that into a weekly rhythm?",
  "I remember you mentioning something similar a few weeks ago. Let me check my reflections...\n\nYes — on March 15th you wrote about feeling pulled between two priorities. The resolution you landed on then was to **pick one anchor task per day** and let everything else orbit around it.\n\nDoes that still feel right, or has something shifted?",
  "Here's what I found from searching the web:\n\n> **Top Headlines — March 24, 2026**\n>\n> - Tech stocks rally on AI infrastructure spending announcements\n> - New climate report shows accelerated Arctic ice loss\n> - Local elections see record turnout in Virginia\n\nWant me to dig deeper into any of these?",
  "I appreciate you trusting me with that. I don't have all the answers, but I can help you think through it.\n\nLet's start with what you already know:\n\n- What feels most urgent right now?\n- What feels most *important* (even if it's not urgent)?\n\nSometimes just separating those two helps clarify the next step.",
  "```python\ndef calculate_streak(entries):\n    \"\"\"Count consecutive days with journal entries.\"\"\"\n    if not entries:\n        return 0\n    \n    sorted_dates = sorted(set(e.date for e in entries), reverse=True)\n    streak = 1\n    \n    for i in range(1, len(sorted_dates)):\n        diff = (sorted_dates[i-1] - sorted_dates[i]).days\n        if diff == 1:\n            streak += 1\n        else:\n            break\n    \n    return streak\n```\n\nHere's a clean implementation. It sorts unique entry dates and counts backward from the most recent, breaking on any gap.",
]

// Drain a mockStreamChat generator while fake timers are active. Each `await
// sleep(...)` inside the generator schedules a real timer; advanceTimersByTimeAsync
// fires it AND flushes the microtask queue, so the generator resumes and yields
// the next chunk. We loop until the iterator reports done. The advance amount
// covers the initial MOCK_DELAY (300) and per-word delays (max 20+30=50).
async function drain(gen) {
  const chunks = []
  let next = gen.next()
  // Kick the first await (MOCK_DELAY) and every subsequent per-word await.
  // 400ms per step comfortably exceeds the largest single delay.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await vi.advanceTimersByTimeAsync(400)
    const result = await next
    if (result.done) break
    chunks.push(result.value)
    next = gen.next()
  }
  return chunks.join('')
}

describe('mockStreamChat — fake-timer word streaming', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('streams a full response reassembled from word chunks', async () => {
    const reassembled = await drain(mockStreamChat([{ role: 'user', content: 'hi' }]))
    // Whatever response the round-robin handed us, the chunks must rebuild it
    // exactly (split on space, space re-added between words).
    expect(EMBER_RESPONSES).toContain(reassembled)
  })

  it('round-robins through the response pool in order, wrapping', async () => {
    // Capture one full cycle's worth of responses. The module counter persists
    // across the suite, so we don't assume a start index — instead we find the
    // first response in the pool and assert the next ones follow in order.
    const captured = []
    for (let i = 0; i < EMBER_RESPONSES.length; i++) {
      captured.push(await drain(mockStreamChat([{ role: 'user', content: 'x' }])))
    }

    const start = EMBER_RESPONSES.indexOf(captured[0])
    expect(start).toBeGreaterThanOrEqual(0)

    for (let i = 0; i < captured.length; i++) {
      const expected = EMBER_RESPONSES[(start + i) % EMBER_RESPONSES.length]
      expect(captured[i]).toBe(expected)
    }
  })
})

describe('mockGetProjects', () => {
  it('returns the fixed project list', async () => {
    const projects = await mockGetProjects()
    expect(projects).toEqual([
      { id: 'general', name: 'General', color: '#7a6a5e' },
      { id: 'ember-dev', name: 'Ember Development', color: '#ff8c00' },
      { id: 'work', name: 'Work', color: '#4a9eff' },
      { id: 'personal', name: 'Personal', color: '#8b5cf6' },
    ])
  })
})
