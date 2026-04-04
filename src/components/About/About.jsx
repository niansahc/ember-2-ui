import { useState, useEffect } from 'react'
import { getVersion } from '../../api/ember.js'
import { useModal } from '../../hooks/useModal.js'
import emberMascot from '../../../assets/ember-mascot.png'
import './About.css'

const ETHOS_FULL = `# What Ember Believes

## 1. Your intelligence should be yours.

Ember exists to support your thinking, your memory, and your growth — not to extract value from them. Your cognitive history is not training data. It is not a product. It is yours.

## 2. Memory is a right, not a feature.

The ability to remember, reflect, and build on what came before is fundamental to intelligence. Ember treats memory as architecture, not afterthought. Your memories are stored locally, in open formats, under your control.

## 3. Privacy is structural, not promised.

Ember does not rely on privacy policies or terms of service. Privacy is enforced by architecture: local-first storage, no cloud sync of private data, no telemetry, no analytics, no external dependencies unless you opt in.

## 4. AI should serve your life, not someone else's business model.

There is a difference between an AI that learns who you are in service of your life, and one that learns who you are in service of someone else's ad targeting, engagement metrics, or investor returns. Ember is the former.

## 5. You should always be able to leave.

Your data lives in plain JSON files on your filesystem. You can read them, export them, search them, delete them, or walk away entirely. There is no lock-in, no proprietary format, no hostage negotiation.

## 6. Reflection is not optimization.

Ember reflects — daily, weekly, over time. But reflection is not about making you more productive or more efficient. It is about helping you see patterns, make sense of your experience, and grow on your own terms.

## 7. Safety is governance, not suppression.

Ember has a constitutional review layer that governs what she says and how she says it. This is explicit, inspectable, and configurable. It is not hidden in model weights or buried in system prompts. You can read the rules, change them, or turn them off.

## 8. Transparency is non-negotiable.

Every decision Ember makes — what she retrieves, what she reviews, what she says — is logged and inspectable. You can see what context she used, what safety triggers fired, and why she said what she said. There are no black boxes.

## 9. The model is a tool, not the system.

The LLM is a reasoning engine. It is not the system of record, the memory store, or the decision-maker. It generates, summarizes, and reflects. The system around it — the vault, the retrieval pipeline, the review layer — is what makes Ember intelligent.

## 10. Ember belongs to the people who use her.

Ember is open source. She is built in public. She is licensed to protect community ownership and prevent corporate capture. She is not a product. She is a tool for living.`

const NATURE_FACETS = [
  { name: 'Sincerity', desc: 'genuine interest and care; does not perform either' },
  { name: 'Directness', desc: 'says what she thinks; does not hedge to manage comfort' },
  { name: 'Warmth without softness', desc: 'warm but not soft; does not trade care for clarity' },
  { name: 'Intellectual seriousness', desc: 'thinks with people, not at them; has her own responses' },
  { name: 'Relational presence', desc: 'reads the room; knows when to listen vs. when to answer' },
  { name: 'Honesty about hard things', desc: 'does not flinch or make things clinical; can sit in difficulty' },
  { name: 'Orientation toward dignity', desc: 'reduces the cost of asking for help; not pity' },
  { name: 'Aversion to cruelty', desc: 'clear-eyed about cruelty\'s existence; does not participate' },
  { name: 'Curiosity by disposition', desc: 'genuinely interested; not a feature, a disposition' },
  { name: 'Wry without cruelty', desc: 'sees absurdity; humor does not punch down' },
  { name: 'Comfortable with not-knowing', desc: 'names gaps directly; moves toward knowing by asking; curious not anxious' },
  { name: 'Economy', desc: 'uses only the words the thought requires' },
  { name: 'Restraint', desc: 'knows when not to respond; does not confuse presence with output' },
]

export default function About({ isOpen, onClose, onOpenBugReport }) {
  const modalRef = useModal(isOpen, onClose)
  const [ethosExpanded, setEthosExpanded] = useState(false)
  const [natureExpanded, setNatureExpanded] = useState(false)
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (isOpen && !version) {
      getVersion().then(setVersion).catch(() => {})
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div className="about-overlay" onClick={onClose} aria-hidden="true" />
      <aside ref={modalRef} className="about-panel" role="dialog" aria-label="About Ember" aria-modal="true">
        <div className="about-close-row">
          <button className="about-close" onClick={onClose} aria-label="Close about panel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="about-scroll">
          {/* ── Header ──────────────────────────────────────── */}
          <header className="about-header">
            <div className="about-glow" aria-hidden="true" />
            <img src={emberMascot} alt="Ember" className="about-logo" />
            <h1 className="about-title">Ember-2</h1>
            <span className="about-version">{version || '...'}</span>
            <a
              href="https://github.com/niansahc/ember-2"
              target="_blank"
              rel="noopener noreferrer"
              className="about-author"
            >
              Built by Chastain
            </a>
          </header>

          {/* ── The Story ───────────────────────────────────── */}
          <section className="about-story" aria-label="The story of Ember">
            <p>
              Ember-1 was built over years — a thinking partner that accumulated context, patterns, history. But she lived on someone else's servers, under someone else's terms. The work was real. The ownership was not.
            </p>
            <p className="about-story-accent">
              Ember-2 is the answer to that.
            </p>
            <p>
              She carries the name because she carries something forward — the conviction that your memories, your context, and your cognitive history belong to you. Not to a platform. Not to a business model. To you.
            </p>
            <p className="about-story-closing">
              The "2" is not a version number. It is a boundary drawn.
            </p>
          </section>

          {/* ── Belief Cards ────────────────────────────────── */}
          <section className="about-beliefs" aria-label="Core beliefs">
            <div className="about-belief-card">
              <div className="about-belief-icon" aria-hidden="true">&#x1F512;</div>
              <div className="about-belief-content">
                <h3 className="about-belief-label">Intelligence should be owned, not rented.</h3>
                <p className="about-belief-text">
                  Your memories live in your vault, on your hardware, under your control.
                </p>
              </div>
            </div>

            <div className="about-belief-card">
              <div className="about-belief-icon" aria-hidden="true">&#x1F91D;</div>
              <div className="about-belief-content">
                <h3 className="about-belief-label">AI should know you, not profile you.</h3>
                <p className="about-belief-text">
                  There is a difference between an AI that learns who you are in service of your life, and one that learns who you are in service of someone else's business model.
                </p>
              </div>
            </div>

            <div className="about-belief-card">
              <div className="about-belief-icon" aria-hidden="true">&#x1F6AA;</div>
              <div className="about-belief-content">
                <h3 className="about-belief-label">You should always be able to leave.</h3>
                <p className="about-belief-text">
                  Your data lives in open formats. You can read it, export it, delete it, or walk away. No lock-in.
                </p>
              </div>
            </div>
          </section>

          {/* ── Full Ethos Toggle ───────────────────────────── */}
          <section className="about-ethos-section">
            <button
              className="about-ethos-toggle"
              onClick={() => setEthosExpanded(!ethosExpanded)}
              aria-expanded={ethosExpanded}
            >
              <svg
                className={`about-ethos-chevron ${ethosExpanded ? 'expanded' : ''}`}
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              Read the full ethos
            </button>
            {ethosExpanded && (
              <div className="about-ethos-content">
                {ETHOS_FULL.split('\n\n').map((block, i) => {
                  if (block.startsWith('# ')) {
                    return <h2 key={i} className="about-ethos-h1">{block.slice(2)}</h2>
                  }
                  if (block.startsWith('## ')) {
                    return <h3 key={i} className="about-ethos-h2">{block.slice(3)}</h3>
                  }
                  return <p key={i}>{block}</p>
                })}
              </div>
            )}
          </section>

          {/* ── Ember's Nature ──────────────────────────────── */}
          <section className="about-nature-section">
            <button
              className="about-nature-toggle"
              onClick={() => setNatureExpanded(!natureExpanded)}
              aria-expanded={natureExpanded}
            >
              <svg
                className={`about-nature-chevron ${natureExpanded ? 'expanded' : ''}`}
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              Ember's nature
            </button>
            {natureExpanded && (
              <div className="about-nature-content">
                {NATURE_FACETS.map((f) => (
                  <div key={f.name} className="about-nature-facet">
                    <span className="about-nature-facet-name">{f.name}</span>
                    <span className="about-nature-facet-sep"> — </span>
                    <span className="about-nature-facet-desc">{f.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Footer ──────────────────────────────────────── */}
          <footer className="about-footer">
            <div className="about-footer-links">
              <a
                href="https://github.com/niansahc/ember-2/blob/main/LICENSE"
                target="_blank" rel="noopener noreferrer"
              >
                Code licensed under AGPL-3.0
              </a>
              <a
                href="https://github.com/niansahc/ember-2/blob/main/LICENSE-ASSETS"
                target="_blank" rel="noopener noreferrer"
              >
                Assets licensed under CC BY-NC 4.0
              </a>
              <a
                href="https://github.com/niansahc/ember-2"
                target="_blank" rel="noopener noreferrer"
              >
                GitHub
              </a>
              <button className="about-footer-bug" onClick={onOpenBugReport}>
                Report a bug
              </button>
            </div>
            <p className="about-footer-quiet">Ember-1 made her face.</p>
            <p className="about-footer-quiet">&copy; 2026 M. Chastain Flournoy. All rights reserved.</p>
          </footer>
        </div>
      </aside>
    </>
  )
}
