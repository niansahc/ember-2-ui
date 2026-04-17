/**
 * src/api/mock.js
 *
 * Mock API layer. Returns simulated responses so the UI can be built
 * and tested independently of the real Ember API.
 */

const MOCK_DELAY = 300

const EMBER_RESPONSES = [
  "I've been thinking about what you shared earlier. There's a pattern forming here that I think is worth exploring together.",
  "That's an interesting question. Let me pull from what I know about you and think through this carefully.\n\nBased on your recent journal entries, I notice you've been circling back to this theme of **balance** — between deep focus and the need for variety.\n\nHere's what I'd suggest:\n\n1. Block your mornings for the deep work\n2. Use afternoons for exploratory tasks\n3. Keep a running list of \"sparks\" — ideas that excite you but don't need action yet\n\nWould you like me to help you structure that into a weekly rhythm?",
  "I remember you mentioning something similar a few weeks ago. Let me check my reflections...\n\nYes — on March 15th you wrote about feeling pulled between two priorities. The resolution you landed on then was to **pick one anchor task per day** and let everything else orbit around it.\n\nDoes that still feel right, or has something shifted?",
  "Here's what I found from searching the web:\n\n> **Top Headlines — March 24, 2026**\n>\n> - Tech stocks rally on AI infrastructure spending announcements\n> - New climate report shows accelerated Arctic ice loss\n> - Local elections see record turnout in Virginia\n\nWant me to dig deeper into any of these?",
  "I appreciate you trusting me with that. I don't have all the answers, but I can help you think through it.\n\nLet's start with what you already know:\n\n- What feels most urgent right now?\n- What feels most *important* (even if it's not urgent)?\n\nSometimes just separating those two helps clarify the next step.",
  "```python\ndef calculate_streak(entries):\n    \"\"\"Count consecutive days with journal entries.\"\"\"\n    if not entries:\n        return 0\n    \n    sorted_dates = sorted(set(e.date for e in entries), reverse=True)\n    streak = 1\n    \n    for i in range(1, len(sorted_dates)):\n        diff = (sorted_dates[i-1] - sorted_dates[i]).days\n        if diff == 1:\n            streak += 1\n        else:\n            break\n    \n    return streak\n```\n\nHere's a clean implementation. It sorts unique entry dates and counts backward from the most recent, breaking on any gap.",
]

// Module-level counter — cycles deterministically through EMBER_RESPONSES
// so each mock message is different. Persists across calls within the same
// page session (useful for testing multiple exchanges).
let responseIndex = 0

/** Round-robin through mock responses. */
function getNextResponse() {
  const response = EMBER_RESPONSES[responseIndex % EMBER_RESPONSES.length]
  responseIndex++
  return response
}

/**
 * Simulate a streaming chat response.
 * Yields chunks of text with small delays to mimic real streaming.
 */
export async function* mockStreamChat(messages) {
  await sleep(MOCK_DELAY)

  const response = getNextResponse()
  const words = response.split(' ')

  for (let i = 0; i < words.length; i++) {
    // Re-add the space between words since split(' ') strips them
    const chunk = (i === 0 ? '' : ' ') + words[i]
    yield chunk
    await sleep(20 + Math.random() * 30)
  }
}

/**
 * Check if the API is reachable. In mock mode, always resolves after a delay.
 */
export async function mockCheckConnection() {
  await sleep(1500)
  return { ok: true, model: 'qwen2.5:14b' }
}

/**
 * Get project list.
 */
export async function mockGetProjects() {
  return [
    { id: 'general', name: 'General', color: '#7a6a5e' },
    { id: 'ember-dev', name: 'Ember Development', color: '#ff8c00' },
    { id: 'work', name: 'Work', color: '#4a9eff' },
    { id: 'personal', name: 'Personal', color: '#8b5cf6' },
  ]
}

/**
 * Get conversation list.
 */
export async function mockGetConversations() {
  return [
    // General (no project) — show in chronological list
    { id: '1', title: 'Weekly planning session', updatedAt: '2026-03-24T10:30:00Z' },
    { id: '2', title: 'Journal reflection — patterns', updatedAt: '2026-03-23T19:15:00Z' },
    { id: '5', title: 'Recipe ideas for the week', updatedAt: '2026-03-20T18:30:00Z' },
    // Project conversations
    { id: '3', title: 'Python streaming question', updatedAt: '2026-03-22T14:45:00Z', projectId: 'ember-dev' },
    { id: '6', title: 'Retrieval eval benchmarks', updatedAt: '2026-03-23T11:00:00Z', projectId: 'ember-dev' },
    { id: '7', title: 'State layer design', updatedAt: '2026-03-21T16:00:00Z', projectId: 'ember-dev' },
    { id: '4', title: 'Work priorities discussion', updatedAt: '2026-03-21T09:00:00Z', projectId: 'work' },
    { id: '8', title: 'Q2 planning notes', updatedAt: '2026-03-20T10:00:00Z', projectId: 'work' },
    { id: '9', title: 'Morning routine check-in', updatedAt: '2026-03-22T08:00:00Z', projectId: 'personal' },
  ]
}

/**
 * Get installed Ollama models.
 */
export async function mockGetOllamaModels() {
  await sleep(400)
  return [
    'qwen2.5:14b',
    'llama3.2:3b',
    'mistral:7b',
    'deepseek-r1:8b',
    'llama3.2-vision:11b',
    'llava:13b',
  ]
}

/**
 * Get messages for a conversation by ID.
 */
// Mock conversation histories keyed by conversation ID. IDs match the ones
// returned by mockGetConversations() — the coupling is invisible but required.
const MOCK_HISTORIES = {
  '1': [
    { id: 'h1a', role: 'user', content: "Let's plan out my week. I have three big things I need to get done.", timestamp: '2026-03-24T10:30:00Z' },
    { id: 'h1b', role: 'assistant', content: "I'd love to help you plan. What are the three big things?\n\nAnd before we dive in — is there anything from last week that's carrying over? Sometimes the unfinished threads are the ones that matter most.", timestamp: '2026-03-24T10:30:15Z' },
    { id: 'h1c', role: 'user', content: "The retrieval eval expansion, the state layer tests, and I need to write the audit script.", timestamp: '2026-03-24T10:31:00Z' },
    { id: 'h1d', role: 'assistant', content: "Good list. Here's how I'd sequence those:\n\n1. **Audit script first** (Monday/Tuesday) — it's the most self-contained and will give you a clean picture of vault health before you touch retrieval\n2. **State layer tests** (Wednesday) — builds on existing stubs, moderate scope\n3. **Retrieval eval expansion** (Thursday/Friday) — the most open-ended, so give it room at the end\n\nDoes that order feel right, or do any of these have external deadlines pushing them up?", timestamp: '2026-03-24T10:31:20Z' },
  ],
  '2': [
    { id: 'h2a', role: 'user', content: "I've been noticing a pattern in my journal entries. I keep coming back to the same themes.", timestamp: '2026-03-23T19:15:00Z' },
    { id: 'h2b', role: 'assistant', content: "That's actually a really valuable observation. Recurring themes in journal entries often point to something your mind is trying to work through.\n\nFrom what I've seen in your recent reflections, a few threads keep surfacing:\n\n- **Balance between depth and breadth** — wanting to go deep on Ember but also feeling pulled toward new ideas\n- **Energy management** — noticing when you're sharp vs. when you're running on fumes\n- **The gap between planning and doing** — lots of good plans, sometimes friction in execution\n\nDo any of those resonate, or is there a different pattern you're seeing?", timestamp: '2026-03-23T19:15:30Z' },
  ],
  '3': [
    { id: 'h3a', role: 'user', content: "How do I stream responses from an API in Python? I want to show them as they come in.", timestamp: '2026-03-22T14:45:00Z' },
    { id: 'h3b', role: 'assistant', content: "Here's the clean way to do it with `httpx`:\n\n```python\nimport httpx\n\nasync def stream_response(prompt: str):\n    async with httpx.AsyncClient() as client:\n        async with client.stream(\n            'POST',\n            'http://localhost:8000/v1/chat/completions',\n            json={'messages': [{'role': 'user', 'content': prompt}], 'stream': True},\n        ) as response:\n            async for chunk in response.aiter_lines():\n                if chunk.startswith('data: '):\n                    data = chunk[6:]\n                    if data == '[DONE]':\n                        break\n                    print(data, end='', flush=True)\n```\n\nKey points:\n- Use `client.stream()` to get chunks as they arrive\n- `aiter_lines()` gives you one SSE line at a time\n- Strip the `data: ` prefix and handle the `[DONE]` sentinel\n\nWant me to show the FastAPI side too?", timestamp: '2026-03-22T14:45:30Z' },
  ],
  '4': [
    { id: 'h4a', role: 'user', content: "I'm feeling overwhelmed with work priorities. Too many things feel urgent.", timestamp: '2026-03-21T09:00:00Z' },
    { id: 'h4b', role: 'assistant', content: "I hear you. When everything feels urgent, the first thing to do is separate **actually urgent** from **feels urgent**.\n\nLet's try a quick sort:\n\n- What has a hard deadline this week?\n- What would have real consequences if you didn't touch it for 3 days?\n- What's just... hovering in your mind taking up space?\n\nThat third category is usually the biggest, and naming it often takes the pressure off.", timestamp: '2026-03-21T09:00:20Z' },
  ],
  '5': [
    { id: 'h5a', role: 'user', content: "What should I cook this week? I want something easy but not boring.", timestamp: '2026-03-20T18:30:00Z' },
    { id: 'h5b', role: 'assistant', content: "Here are a few ideas that are low-effort but actually good:\n\n- **Monday**: Sheet pan chicken thighs with roasted vegetables — season, toss on a pan, 400F for 35 min\n- **Tuesday**: Black bean tacos with quick-pickled onions and avocado\n- **Wednesday**: One-pot lemon pasta — boil pasta, toss with olive oil, lemon, parmesan, and whatever greens you have\n- **Thursday**: Leftover remix night — whatever's in the fridge becomes a bowl\n- **Friday**: Homemade pizza on naan bread — 10 minutes under the broiler\n\nWant me to flesh out any of these with full instructions?", timestamp: '2026-03-20T18:30:25Z' },
  ],
}

/** Load mock message history for a conversation. Returns [] for unknown IDs. */
export async function mockGetMessages(conversationId) {
  await sleep(200)
  return MOCK_HISTORIES[conversationId] || []
}


/**
 * Check for updates against GitHub releases.
 */
export async function mockCheckUpdate() {
  await sleep(600)
  return {
    hasUpdate: false,
    current: 'v0.9.0',
    latest: 'v0.9.0',
    changelog: '',
  }
}

/** Promise-based delay. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
