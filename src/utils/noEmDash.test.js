import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const EM_DASH = '—'
const BACKSLASH = String.fromCharCode(92)
const SRC = join(process.cwd(), 'src')
// settingsCopy.js defines the em-dash constant that hasEmDash() checks for.
const ALLOWED = new Set(['utils/settingsCopy.js'])

// Drops // and /* */ comments (including JSX {/* */}), keeping string,
// template and JSX text. A quote ends at a newline so an apostrophe in JSX
// text cannot swallow the rest of the file.
export function stripComments(src) {
  let out = ''
  let i = 0
  let quote = null
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (quote) {
      out += c
      if (c === BACKSLASH) { out += n ?? ''; i += 2; continue }
      if (c === quote || (c === '\n' && quote !== '`')) quote = null
      i++
      continue
    }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end === -1 ? src.length : end + 2
      continue
    }
    if (c === '"' || c === "'" || c === '`') quote = c
    out += c
    i++
  }
  return out
}

export function findEmDashes(src) {
  return stripComments(src)
    .split('\n')
    .map((text, idx) => ({ line: idx + 1, text: text.trim() }))
    .filter((l) => l.text.includes(EM_DASH))
}

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sourceFiles(p)
    return /\.(js|jsx)$/.test(name) && !/\.test\.js$/.test(name) ? [p] : []
  })
}

describe('no em dash in src code or user-facing strings', () => {
  const files = sourceFiles(SRC).filter((p) => !ALLOWED.has(relative(SRC, p).split(sep).join('/')))

  it('scans a non-trivial set of files', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('no src js/jsx string literal, template or JSX text contains an em dash', () => {
    const hits = files.flatMap((p) =>
      findEmDashes(readFileSync(p, 'utf8')).map((h) => `${relative(SRC, p)}:${h.line}  ${h.text}`),
    )
    expect(hits).toEqual([])
  })
})

describe('em dash guard positive controls', () => {
  it('flags a single-quoted literal', () => {
    expect(findEmDashes(`const a = 'x ${EM_DASH} y'`)).toHaveLength(1)
  })
  it('flags a double-quoted literal with an apostrophe', () => {
    expect(findEmDashes(`f("Couldn't ${EM_DASH} try")`)).toHaveLength(1)
  })
  it('flags a template literal', () => {
    expect(findEmDashes('const a = `x ' + EM_DASH + ' y`')).toHaveLength(1)
  })
  it('flags JSX text, including after an apostrophe', () => {
    expect(findEmDashes(`<p>won't be saved ${EM_DASH} sorry</p>`)).toHaveLength(1)
  })
  it('flags a literal that follows a comment', () => {
    expect(findEmDashes(`// note\nconst a = 'x ${EM_DASH} y'`)).toHaveLength(1)
  })
  it('ignores line, block and JSX comments', () => {
    expect(findEmDashes(`// a ${EM_DASH} b\n/* c ${EM_DASH} d */\n{/* e ${EM_DASH} f */}`)).toEqual([])
  })
  it('the real-file assertion fails when a dash is present in a real source file', () => {
    const real = readFileSync(join(SRC, 'components/Sidebar/Sidebar.jsx'), 'utf8')
    const mutated = real.replace("Couldn't delete. Try again.", `Couldn't delete ${EM_DASH} try again`)
    expect(mutated).not.toBe(real)
    expect(findEmDashes(mutated).length).toBeGreaterThan(0)
    expect(findEmDashes(real)).toEqual([])
  })
})
