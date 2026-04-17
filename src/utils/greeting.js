/**
 * greeting.js — time-of-day greetings in Ember's voice.
 *
 * Her nature (see ember-2/config/nature.yaml): sincerity, directness,
 * warmth without softness, economy, restraint, wry without cruelty,
 * relational presence. Greetings reflect that — short, honest, never
 * performative. No "Good morning, dear friend!" energy.
 *
 * Returns a { title, subtitle } pair. Subtitle is often null — Ember
 * doesn't fill space when space will do. Name appears ~40% of the
 * time; the rest, the greeting stands on its own.
 *
 * Randomness is intentionally via Math.random() — consumers should
 * memoize the result for the session (e.g. useState(() => getGreeting(...)))
 * so the greeting doesn't flicker on re-render.
 */

// Time buckets cover the full 24h. `end` is exclusive.
// Late night is 0-5 first so a 2am lookup falls into it, not morning.
const TIME_BUCKETS = [
  { id: 'late_night', start: 0,  end: 5  },
  { id: 'morning',    start: 5,  end: 12 },
  { id: 'afternoon',  start: 12, end: 17 },
  { id: 'evening',    start: 17, end: 22 },
  { id: 'night',      start: 22, end: 24 },
]

function bucketFor(hour) {
  return TIME_BUCKETS.find((b) => hour >= b.start && hour < b.end) || TIME_BUCKETS[0]
}

// Greeting pools — each entry is a complete, self-contained line.
// {name} is filled at render time; lines without {name} are used when
// we're rolling the "no name" branch.
const VARIANTS = {
  late_night: {
    withName: [
      'Still up, {name}?',
      'Late one, {name}.',
      'Back, {name}.',
      "You're here, {name}.",
    ],
    withoutName: [
      'Still up?',
      'Late one.',
      'Quiet hour.',
      'Back at it.',
    ],
  },
  morning: {
    withName: [
      'Morning, {name}.',
      'Morning, {name}. How did you sleep?',
      "You're up, {name}.",
      'Early, {name}?',
    ],
    withoutName: [
      'Morning.',
      'New day.',
      'Morning. Slow start or sharp?',
      "You're up.",
    ],
  },
  afternoon: {
    withName: [
      'Afternoon, {name}.',
      'Midday, {name}.',
      "How's it going, {name}?",
      'Back, {name}.',
    ],
    withoutName: [
      'Afternoon.',
      'Middle of the day.',
      "How's it going?",
      'Hi.',
    ],
  },
  evening: {
    withName: [
      'Evening, {name}.',
      'How was it, {name}?',
      'Back, {name}.',
      "End of the day, {name}.",
    ],
    withoutName: [
      'Evening.',
      'End of the day.',
      'How was it?',
      'You made it.',
    ],
  },
  night: {
    withName: [
      'Night, {name}.',
      'Still at it, {name}?',
      'Winding down, {name}?',
      'Quiet one, {name}.',
    ],
    withoutName: [
      'Night.',
      'Still at it?',
      'Winding down?',
      'Last stretch.',
    ],
  },
}

// Subtitle pool — shows roughly half the time. Deliberately spare.
// Mix of invitations and presence-acknowledgements. Ember doesn't
// always need to prompt an action; sometimes the greeting is enough.
const SUBTITLES_POOL = [
  "What's on your mind?",
  'Where should we start?',
  'What are you noticing?',
  'Bring me what you have.',
  'Sit, or work?',
  'Tell me what you know.',
  'Lay it out.',
  null, null, null, null,   // weight toward no subtitle — presence > prompt
]

// Simple seedable random — not cryptographic; just for determinism in tests
// if we ever need it. Consumers pass a custom rng or rely on Math.random.
function pick(array, rng) {
  return array[Math.floor((rng || Math.random)() * array.length)]
}

/**
 * Extract a probable first name from the free-form onboarding identity
 * answer. Handles common forms:
 *   "Alex, they/them"           → "Alex"
 *   "My name is Alex"           → "Alex"
 *   "I'm Alex (she/her)"        → "Alex"
 *   "alex"                      → "Alex"
 *   ""                          → null
 *
 * Returns null if nothing name-shaped can be found.
 */
export function extractFirstName(identityText) {
  if (!identityText || typeof identityText !== 'string') return null
  const trimmed = identityText.trim()
  if (!trimmed) return null

  // Explicit "name is X" / "I'm X" / "call me X" patterns.
  const phraseMatch = trimmed.match(
    /(?:name is|i[' ]?m|i am|call me|this is)\s+([A-Za-z][A-Za-z'-]+)/i,
  )
  if (phraseMatch) return capitalize(phraseMatch[1])

  // Fallback: first word-shaped token before any comma or paren.
  const wordMatch = trimmed.match(/^[^,(]*?([A-Za-z][A-Za-z'-]+)/)
  if (wordMatch) return capitalize(wordMatch[1])

  return null
}

function capitalize(s) {
  return s[0].toUpperCase() + s.slice(1).toLowerCase()
}

/**
 * Returns { title, subtitle }.
 *
 * @param {object} opts
 * @param {string|null} opts.name - first name, or null for name-less greetings
 * @param {Date} opts.now - current time (injected for testability; defaults to new Date())
 * @param {() => number} opts.rng - random function (injected for testability)
 */
export function getGreeting({ name = null, now = new Date(), rng = Math.random } = {}) {
  const hour = now.getHours()
  const bucket = bucketFor(hour)
  const variants = VARIANTS[bucket.id]
  const useName = !!name && rng() < 0.4
  const pool = useName ? variants.withName : variants.withoutName
  const raw = pick(pool, rng)
  const title = name ? raw.replace('{name}', name) : raw
  const subtitle = pick(SUBTITLES_POOL, rng)
  return { title, subtitle, bucket: bucket.id }
}
