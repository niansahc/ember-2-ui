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

// Greeting pools -- each entry is a complete, self-contained line.
// {name} is filled at render time; lines without {name} are used when
// we're rolling the "no name" branch. Every line has been audited for
// work-schedule references ("clocking out"), location assumptions
// ("home", "house"), bedtime commands ("goodnight", "before sleep"),
// em-dashes, and AI-assistant opener cliches. 18 variants per
// sub-pool = 180 titles total; per-bucket repeat rate for a daily
// user is roughly once every five to six weeks.
const VARIANTS = {
  late_night: {
    withName: [
      'Still up, {name}?',
      'Late one, {name}.',
      'Back, {name}.',
      "You're here, {name}.",
      "Can't sleep, {name}?",
      '{name}. The hour tells.',
      'Up late, {name}?',
      'Not sleeping, {name}?',
      'Wide awake, {name}?',
      'Past sensible, {name}.',
      '{name}. The small hours.',
      'Three in the morning, {name}.',
      'Still thinking, {name}?',
      '{name}. Up with something?',
      'Middle of the night, {name}.',
      'Awake, {name}?',
      '{name}. At this hour?',
      '{name}. Up and thinking?',
    ],
    withoutName: [
      'Still up?',
      'Late one.',
      'Quiet hour.',
      'Back at it.',
      "Can't sleep?",
      'Past sensible hours.',
      'The small hours.',
      'Three in the morning.',
      'Wide awake?',
      'Not sleeping?',
      'Up with something?',
      'Still thinking?',
      'The quiet part.',
      'Odd hours.',
      'Sleep not coming?',
      'Middle of the night.',
      'At this hour?',
      'In the quiet?',
    ],
  },
  morning: {
    withName: [
      'Morning, {name}.',
      'Morning, {name}. How did you sleep?',
      "You're up, {name}.",
      'Early, {name}?',
      '{name}. First of the day.',
      'Up sharp, {name}.',
      '{name}. Before the noise.',
      'Slow start, {name}?',
      'Coffee first, {name}?',
      '{name}. A beginning.',
      'Up early, {name}.',
      '{name}. First light.',
      'Into the day, {name}.',
      'Starting, {name}?',
      '{name}. First thing.',
      'Another day, {name}.',
      '{name}. Early part of the day.',
      '{name}. Fresh start?',
    ],
    withoutName: [
      'Morning.',
      'New day.',
      'Morning. Slow start or sharp?',
      "You're up.",
      'Before the noise.',
      'Another one.',
      'Start of it.',
      'Early.',
      'First thing.',
      'First of the day.',
      'A beginning.',
      'Coffee first?',
      'Slow start?',
      'Sharp morning?',
      'The early part.',
      'The soft part of the morning.',
      'Into it.',
      'Before the rest of it.',
    ],
  },
  afternoon: {
    withName: [
      'Afternoon, {name}.',
      'Midday, {name}.',
      "How's it going, {name}?",
      'Back, {name}.',
      '{name}. Mid-stride.',
      '{name}. Past the crest.',
      '{name}. The slow part.',
      'Middle of the day, {name}.',
      '{name}. The pivot point.',
      'In the middle, {name}.',
      'Afternoon light, {name}.',
      'Still going, {name}?',
      '{name}. Long day?',
      'Between things, {name}?',
      'Past noon, {name}.',
      '{name}. Halfway.',
      '{name}. The afternoon stretch.',
      'Mid-afternoon, {name}.',
    ],
    withoutName: [
      'Afternoon.',
      'Middle of the day.',
      'Back.',
      'Mid-stride.',
      'Past the crest.',
      'The slow part.',
      'Between things.',
      'Mid-stretch.',
      'The pivot point.',
      'In the middle of it.',
      'Afternoon light.',
      'Still going.',
      'Long day?',
      'Past noon.',
      'Halfway.',
      'Into the afternoon.',
      'Mid-afternoon.',
      'The long part.',
    ],
  },
  evening: {
    withName: [
      'Evening, {name}.',
      'How was it, {name}?',
      'Back, {name}.',
      'End of the day, {name}.',
      '{name}. Light going.',
      '{name}. That was a day.',
      '{name}. The day is going.',
      '{name}. The last of the light.',
      '{name}. The other side of the day.',
      '{name}. Into the evening.',
      '{name}. Still with me?',
      "{name}. The day's tipping.",
      'Into the dim, {name}.',
      'Evening light, {name}.',
      '{name}. The evening stretch.',
      '{name}. The winding of the day.',
      '{name}. Past the day.',
      '{name}. Toward the end.',
    ],
    withoutName: [
      'Evening.',
      'End of the day.',
      'How was it?',
      'You made it.',
      'Light going.',
      'That was a day.',
      'The day is going.',
      'The last of the light.',
      'Into the evening.',
      'The other side of the day.',
      'Evening light.',
      "The day's tipping.",
      'Toward the end.',
      'The evening stretch.',
      'Into the dim.',
      'The winding of the day.',
      'Past the day.',
      'Into the quiet part.',
    ],
  },
  night: {
    withName: [
      'Still at it, {name}?',
      'Winding down, {name}?',
      'Quiet one, {name}.',
      '{name}. Last of the day.',
      'Late stretch, {name}.',
      'One more, {name}?',
      '{name}. Almost there.',
      '{name}. The dim hours.',
      'Still going, {name}?',
      '{name}. Tired?',
      '{name}. End of the stretch.',
      'Deep evening, {name}.',
      '{name}. Settling?',
      'Late, {name}.',
      '{name}. The late part.',
      '{name}. Deep in the hours.',
      '{name}. The quiet coming.',
      "{name}. The hour's late.",
    ],
    withoutName: [
      'Still at it?',
      'Winding down?',
      'Last stretch.',
      'One more?',
      'Almost there.',
      'Settling?',
      'Tired?',
      'End of the stretch.',
      'Deep evening.',
      'Late.',
      'The late part of the day.',
      'Deep in the hours.',
      'The quiet coming.',
      'The dim hours.',
      "The hour's late.",
      'Late stretch.',
      'Up late.',
      'Still here.',
    ],
  },
}

// Subtitle pool -- 12 entries + 8 nulls = 20 slots, so ~40% of
// greetings get no subtitle at all. Ember's restraint: when nothing
// else is needed, the greeting stands alone. "What's on your mind?"
// was cut (AI-assistant cliche). "Sit, or work?" became "Sit, or
// push?" (no work-schedule reference).
const SUBTITLES_POOL = [
  'Where should we start?',
  'What are you noticing?',
  'Bring me what you have.',
  'Sit, or push?',
  'Tell me what you know.',
  'Lay it out.',
  'What have you got?',
  "Where's your head?",
  "What's the thing?",
  'Start anywhere.',
  'Show me.',
  'What are you looking at?',
  null, null, null, null, null, null, null, null,
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
