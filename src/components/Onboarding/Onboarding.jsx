import { useState } from 'react'
import { writeMemory, writeState, updatePreferences } from '../../api/ember.js'
import emberMascot from '../../../assets/ember-mascot.png'
import './Onboarding.css'

const PROFILE_QUESTIONS = [
  {
    key: 'identity',
    label: "What's your name, and what pronouns do you use?",
    placeholder: 'e.g. Alex, they/them',
    category: 'identity',
    tags: ['identity', 'profile'],
  },
  {
    key: 'environment',
    label: 'Where do you live, and what does your home or work environment look like?',
    placeholder: 'e.g. Portland, work from home, small apartment',
    category: 'environment',
    tags: ['location', 'home', 'profile'],
  },
  {
    key: 'health',
    label: 'Any health context that shapes your day-to-day capacity?',
    placeholder: 'e.g. chronic illness, neurodivergence, energy variability',
    category: 'health',
    tags: ['health', 'profile'],
  },
  {
    key: 'professional',
    label: 'What do you do for work?',
    placeholder: 'e.g. software engineer, teacher, freelance designer',
    category: 'professional',
    tags: ['work', 'profession', 'profile'],
  },
  {
    key: 'personal',
    label: 'What do you do outside of work? What matters to you?',
    placeholder: 'e.g. gardening, music, spending time with family',
    category: 'personal',
    tags: ['interests', 'profile'],
  },
  {
    key: 'communication',
    label: 'How do you want Ember to communicate with you?',
    placeholder: 'e.g. direct, casual, avoid corporate language',
    category: 'communication',
    tags: ['communication', 'preferences', 'profile'],
  },
  {
    key: 'ai_relationship',
    label: 'What do you actually want from Ember?',
    placeholder: 'e.g. help me think, track my projects, remember things for me',
    category: 'ai_relationship',
    tags: ['ai-preferences', 'values', 'profile'],
  },
]

const LODESTONE_SECTIONS = [
  {
    title: 'How you spend your time',
    questions: [
      {
        key: 'time_1',
        label: 'What takes up most of your time right now?',
        placeholder: 'e.g. work, caregiving, a project, studying, a hobby',
        help: 'Helps Ember understand your current context. Examples: raising kids and freelancing on the side, recovering from an injury, building a business.',
      },
      {
        key: 'time_2',
        label: 'What do you do when you have unstructured time with no obligations?',
        placeholder: 'e.g. read, go outside, make things, play games, nothing in particular',
        help: 'Helps Ember understand what you gravitate toward naturally. Examples: tinkering with projects, watching documentaries, being outside, talking to people.',
      },
      {
        key: 'time_3',
        label: "What's something you've done repeatedly over the last year that wasn't required of you?",
        placeholder: 'e.g. a hobby, a practice, something you keep returning to',
        help: 'Repeated voluntary behavior is a strong signal of what you actually value. Examples: gardening, journaling, learning a language, training for something.',
      },
    ],
  },
  {
    title: 'How you make decisions',
    questions: [
      {
        key: 'decisions_1',
        label: 'When you have a decision to make, what do you usually do first?',
        placeholder: 'e.g. research it, talk to someone, sit with it, make a list',
        help: 'Helps Ember understand how you process. Examples: I research extensively before deciding, I talk it through out loud, I sleep on it, I make a pros and cons list.',
      },
      {
        key: 'decisions_2',
        label: 'When two things you care about conflict, how do you decide which one takes priority?',
        placeholder: 'e.g. which feels more urgent, which aligns with my values, which affects other people more',
        help: "There's no right answer. Examples: I go with what's most urgent, I think about long-term impact, I consider who else is affected, I go with my gut.",
      },
      {
        key: 'decisions_3',
        label: 'Do you prefer to plan things out before starting, or figure things out as you go?',
        placeholder: 'e.g. I need a plan, somewhere in between, I prefer to figure it out as I go',
        help: "Neither is better. Just helps Ember know how to support you. Examples: I always outline before I start, I have a rough plan but stay flexible, I work best when I can improvise.",
      },
    ],
  },
  {
    title: 'What matters to you',
    questions: [
      {
        key: 'values_1',
        label: "Is there anything you won't do, even if someone asks you to?",
        placeholder: 'e.g. a way I work, a personal boundary, a commitment I have',
        help: "Helps Ember understand what you protect. Examples: I won't pretend to agree with something I don't, I won't work on things that conflict with my values, I won't sacrifice sleep below a certain point.",
      },
      {
        key: 'values_2',
        label: 'Has there been something you stopped doing because it felt wrong, even when it seemed to be working?',
        placeholder: 'e.g. a job, a habit, a relationship, a way of operating',
        help: 'Walking away from something that\'s technically working reveals a lot about values. Examples: left a well-paying job that felt hollow, stopped a productive habit that felt coercive, ended a friendship that was draining.',
      },
      {
        key: 'values_3',
        label: "What's something you've spent time on in the last year that nobody asked you to?",
        placeholder: 'e.g. learning something, building something, researching something, caring for something',
        help: 'Voluntary investment of time is one of the clearest signals of what you value. Examples: learning a new skill for no professional reason, maintaining a garden, reading deeply about a topic.',
      },
    ],
  },
  {
    title: "What you're working toward",
    questions: [
      {
        key: 'direction_1',
        label: 'What are you trying to change or improve right now?',
        placeholder: 'e.g. a habit, a skill, a situation, how I spend my time',
        help: 'Helps Ember understand your current direction. Examples: trying to be more consistent, learning to delegate, improving my health, building something new.',
      },
      {
        key: 'direction_2',
        label: "Is there something you want to be able to do that you can't do yet?",
        placeholder: 'e.g. a skill, a kind of work, a way of living',
        help: "Helps Ember understand what you're building toward. Examples: run a business, live more simply, speak another language, have more creative time.",
      },
      {
        key: 'direction_3',
        label: "Is there something you think is important that doesn't get much attention?",
        placeholder: 'e.g. something you care about that others seem to overlook',
        help: 'Strongly held beliefs that differ from the mainstream are often the clearest signal of values. Examples: privacy, local community, slow living, a specific approach to health or work.',
      },
    ],
  },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [profileAnswers, setProfileAnswers] = useState({})
  const [lodestoneAnswers, setLodestoneAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [expandedHelp, setExpandedHelp] = useState(null)

  function updateProfile(key, value) {
    setProfileAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function updateLodestone(key, value) {
    setLodestoneAnswers((prev) => ({ ...prev, [key]: value }))
  }

  async function handleProfileNext() {
    setSaving(true)
    try {
      // Write non-empty profile answers to vault
      for (const q of PROFILE_QUESTIONS) {
        const answer = (profileAnswers[q.key] || '').trim()
        if (answer) {
          await writeMemory(answer, 'profile')
        }
      }
    } catch (err) {
      console.warn('[Onboarding] Failed to save some profile answers:', err)
    }
    setSaving(false)
    setStep(2)
  }

  async function handleLodestoneSubmit() {
    const answered = LODESTONE_SECTIONS.flatMap((s) => s.questions)
      .filter((q) => (lodestoneAnswers[q.key] || '').trim())

    if (answered.length === 0) {
      await finishOnboarding()
      return
    }

    setSaving(true)
    try {
      // Store lodestone answers — backend will process via POST /v1/lodestone
      // For now, pass answers to the completion handler for Step 4 processing
      await finishOnboarding(answered.map((q) => ({
        key: q.key,
        label: q.label,
        answer: lodestoneAnswers[q.key].trim(),
      })))
    } catch (err) {
      console.warn('[Onboarding] Failed during lodestone submit:', err)
      await finishOnboarding()
    }
    setSaving(false)
  }

  async function finishOnboarding(lodestoneData) {
    try {
      await writeState('onboarding', 'onboarding_complete', {
        source: 'onboarding_ui',
        tags: ['onboarding', 'system'],
      })
      await updatePreferences({ onboarding_complete: true })
    } catch (err) {
      console.warn('[Onboarding] Failed to write completion state:', err)
    }
    onComplete(lodestoneData || null)
  }

  // ── Step 1: Profile ──────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="onboarding">
        <div className="onboarding-card">
          <div className="onboarding-progress">Step 1 of 4</div>

          <div className="onboarding-welcome">
            <img src={emberMascot} alt="Ember" className="onboarding-logo" />
            <h1 className="onboarding-title">Welcome to Ember</h1>
            <p className="onboarding-subtitle">
              A few optional questions to help Ember understand who you are. Skip anything you like.
            </p>
          </div>

          <div className="onboarding-fields">
            {PROFILE_QUESTIONS.map((q) => (
              <div key={q.key} className="onboarding-field">
                <label className="onboarding-label">{q.label}</label>
                <textarea
                  className="onboarding-input"
                  placeholder={q.placeholder}
                  value={profileAnswers[q.key] || ''}
                  onChange={(e) => updateProfile(q.key, e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>

          <div className="onboarding-actions">
            <button
              className="onboarding-btn onboarding-btn-primary"
              onClick={handleProfileNext}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
            <button
              className="onboarding-btn onboarding-btn-skip"
              onClick={() => setStep(2)}
            >
              Skip all
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Lodestone gate ───────────────────────────────────
  if (step === 2) {
    return (
      <div className="onboarding">
        <div className="onboarding-card onboarding-card-centered">
          <div className="onboarding-progress">Step 2 of 4</div>

          <h1 className="onboarding-title">One more optional step — Lodestone.</h1>

          <div className="onboarding-body-text">
            <p>
              Lodestone is how Ember learns what you value over time. The more Ember
              understands what matters to you, the better she can orient her responses
              toward what's actually useful for your life.
            </p>
            <p>
              You can skip this now and Ember will figure it out gradually through
              your conversations. Or you can answer a few questions to give her a head start.
            </p>
            <p>You can always update this in Settings.</p>
          </div>

          <div className="onboarding-actions onboarding-actions-centered">
            <button
              className="onboarding-btn onboarding-btn-primary"
              onClick={() => setStep(3)}
            >
              Set up Lodestone
            </button>
            <button
              className="onboarding-btn onboarding-btn-skip"
              onClick={() => finishOnboarding()}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Lodestone questionnaire ──────────────────────────
  if (step === 3) {
    return (
      <div className="onboarding">
        <div className="onboarding-card">
          <div className="onboarding-progress">Step 3 of 4</div>

          <h1 className="onboarding-title">Lodestone</h1>
          <p className="onboarding-subtitle">
            All optional. Skip anything. There are no wrong answers.
          </p>

          <div className="onboarding-fields">
            {LODESTONE_SECTIONS.map((section) => (
              <div key={section.title} className="onboarding-section">
                <h2 className="onboarding-section-title">{section.title}</h2>
                {section.questions.map((q) => (
                  <div key={q.key} className="onboarding-field">
                    <div className="onboarding-label-row">
                      <label className="onboarding-label">{q.label}</label>
                      <button
                        className="onboarding-help-btn"
                        onClick={() => setExpandedHelp(expandedHelp === q.key ? null : q.key)}
                        aria-label="More information"
                        title="More information"
                      >
                        ?
                      </button>
                    </div>
                    {expandedHelp === q.key && (
                      <p className="onboarding-help-text">{q.help}</p>
                    )}
                    <textarea
                      className="onboarding-input"
                      placeholder={q.placeholder}
                      value={lodestoneAnswers[q.key] || ''}
                      onChange={(e) => updateLodestone(q.key, e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="onboarding-actions">
            <button
              className="onboarding-btn onboarding-btn-primary"
              onClick={handleLodestoneSubmit}
              disabled={saving}
            >
              {saving ? 'Saving...' : "Done — show me what Ember noticed"}
            </button>
            <button
              className="onboarding-btn onboarding-btn-skip"
              onClick={() => finishOnboarding()}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
