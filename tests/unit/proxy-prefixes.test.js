// Every path the UI fetches must be in tests/e2e/helpers/proxy-prefixes.cjs, the
// list that vite.config.js proxies in dev and mock-bootstrap.cjs absorbs in
// Playwright. A path missing from it falls through to Vite's SPA fallback in dev
// (HTML instead of the backend) and escapes the e2e catch-all.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const PROXY_PREFIXES = require('../e2e/helpers/proxy-prefixes.cjs')
const SRC = fileURLToPath(new URL('../../src', import.meta.url))

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sourceFiles(p)
    return /\.(js|jsx)$/.test(name) && !/\.test\.js$/.test(name) ? [p] : []
  })
}

// First-argument literal of every fetch( call. Backtick, single and double
// quoted literals are read; ${API_URL} resolves to the default API_URL declares.
export function fetchRoots(source) {
  const apiBase = source.match(/VITE_EMBER_API_URL\s*\|\|\s*'([^']+)'/)?.[1] ?? null
  const roots = []
  const unresolved = []
  for (const m of source.matchAll(/\bfetch\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g)) {
    let lit = m[1].slice(1, -1)
    if (/^https?:\/\//.test(lit)) continue
    if (lit.startsWith('${API_URL}')) {
      if (!apiBase) { unresolved.push(lit); continue }
      lit = apiBase + lit.slice('${API_URL}'.length)
    }
    const root = lit.match(/^\/[A-Za-z0-9._-]+/)?.[0]
    if (root) roots.push(root)
    else unresolved.push(lit)
  }
  return { roots, unresolved }
}

export function uncovered(roots, prefixes) {
  return [...new Set(roots)].filter((r) => !prefixes.includes(r)).sort()
}

describe('proxy prefixes cover every path the UI fetches', () => {
  const files = sourceFiles(SRC)
  const all = files.map((p) => fetchRoots(readFileSync(p, 'utf8')))
  const roots = all.flatMap((r) => r.roots)
  const unresolved = all.flatMap((r) => r.unresolved)

  it('reads a non-trivial set of fetch paths from src', () => {
    expect(new Set(roots).size).toBeGreaterThan(10)
    expect(roots).toContain('/v1')
    expect(roots).toContain('/model')
    expect(roots).toContain('/api')
  })

  it('resolves every fetch first argument to a path', () => {
    expect(unresolved).toEqual([])
  })

  it('lists every root the UI fetches', () => {
    expect(uncovered(roots, PROXY_PREFIXES)).toEqual([])
  })
})

describe('proxy prefix guard positive controls', () => {
  it("extracts a path from a new fetch('/new-thing') call", () => {
    expect(fetchRoots("await fetch('/new-thing/x', { headers })").roots).toEqual(['/new-thing'])
  })

  it('resolves ${API_URL} to its declared default', () => {
    const src = "const API_URL = import.meta.env.VITE_EMBER_API_URL || '/v9'\nfetch(`${API_URL}/a`)"
    expect(fetchRoots(src).roots).toEqual(['/v9'])
  })

  it('flags a new fetch path the list does not cover', () => {
    const { roots } = fetchRoots("fetch('/new-thing')")
    expect(uncovered(roots, PROXY_PREFIXES)).toEqual(['/new-thing'])
  })

  it('flags a real UI path when its prefix is removed from the list', () => {
    const roots = sourceFiles(SRC).flatMap((p) => fetchRoots(readFileSync(p, 'utf8')).roots)
    const without = PROXY_PREFIXES.filter((p) => p !== '/provider-key')
    expect(uncovered(roots, without)).toEqual(['/provider-key'])
  })

  it('reports an unresolvable first argument', () => {
    expect(fetchRoots('fetch(`${base}/a`)').unresolved).toEqual(['${base}/a'])
  })

  it('skips external URLs', () => {
    expect(fetchRoots("fetch('https://api.github.com/x')")).toEqual({ roots: [], unresolved: [] })
  })
})
