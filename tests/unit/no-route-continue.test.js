// route.continue() sends a request straight to the network, past mockBootstrap's
// catch-all, so one stray call re-opens the leak to the live API (and its 60/min
// rate limit) with no failing test. Specs must use route.fallback(); it behaves
// the same when no earlier handler exists. See docs/e2e-vault-swap.md.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const E2E_DIR = new URL('../e2e', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

// A spec that genuinely needs the real network (the @needs-live-backend lane)
// may opt out per line with this marker.
const ALLOW = 'allow-route-continue'

export function findRouteContinue(source) {
  return source.split('\n')
    .map((text, i) => ({ line: i + 1, text }))
    .filter(({ text }) => /\broute\.continue\(/.test(text) && !text.includes(ALLOW))
}

describe('e2e specs avoid route.continue()', () => {
  it('no spec or helper calls route.continue()', () => {
    const files = []
    for (const dir of [E2E_DIR, join(E2E_DIR, 'helpers')]) {
      for (const f of readdirSync(dir)) if (f.endsWith('.cjs')) files.push(join(dir, f))
    }
    expect(files.length).toBeGreaterThan(40)
    const hits = files.flatMap((f) =>
      findRouteContinue(readFileSync(f, 'utf8')).map((h) => `${f}:${h.line}`))
    expect(hits).toEqual([])
  })

  it('CONTROL: the scan does flag a route.continue() call and honors the opt-out', () => {
    expect(findRouteContinue('  return route.continue()\n')).toEqual([{ line: 1, text: '  return route.continue()' }])
    expect(findRouteContinue(`route.continue() // ${ALLOW}\n`)).toEqual([])
  })
})
