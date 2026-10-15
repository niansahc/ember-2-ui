// PreToolUse hook: deny agent tool calls that read a .env file.
//
// Why: a real API key and a GitHub token have both ended up in session
// transcripts because an agent cat'd or grepped .env. A transcript is not a
// secret store. This hook refuses the read before it runs.
//
// Covers Read / Grep / Glob (file_path, path, glob; Glob also pattern) and
// Bash / PowerShell (any token of the command that names a .env file).
// `.env.example` is allowed.
//
// Windows-safe: every path-like string is normalised backslash -> slash before
// matching, and matching is on the basename, so `C:\dev\x\.env`,
// `C:/dev/x/.env`, `/c/dev/x/.env` and `.env` are the same thing.
//
// Limits: a pattern check on the call, not a sandbox. A name built at runtime
// (`.e""nv`, base64, a script that opens the file) is not caught.
//
// Input: hook JSON on stdin. Output: a deny decision on stdout, or nothing.
// Exit code is always 0. An unparseable payload is allowed through with a note
// on stderr: failing closed here would block every Read and Bash call and lock
// the session out of fixing it.

'use strict'

// `.env`, `.env.local`, `.env.production`, ... (case-insensitive: Windows).
const ENV_NAME = /^\.env(\..+)?$/i
const EXAMPLE = '.env.example'

// Which input fields of each tool can name a file.
const PATH_FIELDS = {
  Read: ['file_path'],
  Grep: ['path', 'glob'], // Grep's `pattern` is a regex over contents, not a path
  Glob: ['path', 'pattern'],
}

function basename(p) {
  const trimmed = String(p).replace(/\\/g, '/').replace(/\/+$/, '')
  return trimmed.slice(trimmed.lastIndexOf('/') + 1)
}

/** True when `candidate` (a path, filename, or glob) names a protected .env file. */
function namesEnvFile(candidate) {
  if (typeof candidate !== 'string' || !candidate) return false
  const base = basename(candidate)
  const lower = base.toLowerCase()
  // The example file itself, or a glob that can only reach it.
  if (!base || lower === EXAMPLE || (/[*?]/.test(lower) && lower.startsWith(EXAMPLE))) return false
  if (ENV_NAME.test(base)) return true

  // Globs. Only a pattern that starts with a literal dot can match a dotfile
  // (`*` alone does not match `.env`). Compare the literal prefix before the
  // first wildcard: `.e*`, `.en?`, `.env*` and `.env.s*` can all reach a .env
  // file, `.git*` cannot, `.env.example*` is the allowed example file.
  const wild = base.search(/[*?]/)
  if (wild !== -1 && base.startsWith('.')) {
    const literal = lower.slice(0, wild)
    return literal.startsWith('.env') || '.env'.startsWith(literal)
  }

  // Brace sets: `.env{,.local}` / `{.env,.env.local}`.
  const brace = base.match(/^(.*)\{([^}]*)\}(.*)$/)
  if (brace) {
    return brace[2].split(',').some((alt) => namesEnvFile(`${brace[1]}${alt}${brace[3]}`))
  }
  return false
}

// The quoted value of a message flag on a `git` or `gh` command is prose, not a
// path: a commit message or PR body that says "block reads of .env files" must
// not trip the hook. Scoped to git/gh segments so `cmd -m ".env"` elsewhere is
// still scanned, and only the quoted value right after the flag is dropped.
const PROSE_FLAG_VALUE =
  /(?:^|\s)(?:-a?m|--message|--body|--title|--notes)(?:\s+|=)(?:"(?:[^"\\]|\\.)*"|'[^']*')/g

function withoutProse(command) {
  return String(command)
    .split(/([;&|]+)/)
    .map((seg) => (/^\s*(?:git|gh)\s/.test(seg) ? seg.replace(PROSE_FLAG_VALUE, ' ') : seg))
    .join('')
}

// Quotes, separators, redirections and `=` (for --path=.env) all delimit.
// Backslashes do NOT, so Windows paths survive intact.
function commandNamesEnvFile(command) {
  return withoutProse(command)
    .split(/[\s"'`;|&<>(){}=,]+/)
    .filter(Boolean)
    .find(namesEnvFile) ?? null
}

/**
 * @param {object} payload hook JSON ({ tool_name, tool_input })
 * @returns {{deny: boolean, target?: string}}
 */
function evaluate(payload) {
  const tool = payload && payload.tool_name
  const input = (payload && payload.tool_input) || {}

  let target = null
  if (tool === 'Bash' || tool === 'PowerShell') {
    target = commandNamesEnvFile(input.command)
  } else if (PATH_FIELDS[tool]) {
    target = PATH_FIELDS[tool].map((f) => input[f]).find(namesEnvFile) ?? null
  }
  return target ? { deny: true, target } : { deny: false }
}

function denial(target) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Blocked by project hook: reading .env files is not allowed (matched '${target}'). ` +
        `.env holds live credentials and anything read lands in the session transcript. ` +
        `Use .env.example for variable names, or ask the user to supply a value.`,
    },
  }
}

function main() {
  let raw = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => { raw += c })
  process.stdin.on('end', () => {
    let payload
    try {
      payload = JSON.parse(raw)
    } catch (err) {
      process.stderr.write(`[block-env-reads] unparseable hook payload, allowing: ${err.message}\n`)
      return
    }
    const verdict = evaluate(payload)
    if (verdict.deny) process.stdout.write(JSON.stringify(denial(verdict.target)))
  })
}

if (require.main === module) main()

module.exports = { evaluate }
