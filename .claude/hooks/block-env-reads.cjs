// PreToolUse hook: deny agent tool calls that read a .env file.
//
// Why: a real API key and a GitHub token have both ended up in session
// transcripts because an agent cat'd or grepped .env. A transcript is not a
// secret store. This hook refuses the read before it runs.
//
// Covers: Read / Grep / Glob (file_path, path, glob, pattern) and Bash /
// PowerShell (any token of the command that names a .env file). `.env.example`
// is allowed. Writes to .env are already refused by the Edit|Write hook in
// settings.json, so this one is about reads.
//
// Windows-safe by construction. Every path-like string is normalised with
// backslash -> slash BEFORE any matching, and matching is done on the
// basename, so `C:\dev\x\.env`, `C:/dev/x/.env`, `/c/dev/x/.env` and `.env`
// are all the same thing. (A shell-quoting parser such as Python's shlex treats
// a backslash as an escape character and rewrites `C:\dev\.env` before it is
// ever inspected; this file does not use one.)
//
// Limits, stated plainly: this is a pattern check on the call, not a sandbox.
// A command that builds the name at runtime (`.e""nv`, base64, a script that
// reads it) is not caught. It raises the bar for the ordinary shapes.
//
// Input: the hook JSON on stdin. Output: a deny decision on stdout, or nothing.
// Exit code is always 0; an unparseable payload is allowed through (a security
// hook that bricks every tool call gets disabled) with a note on stderr.

'use strict'

const ALLOWED = new Set(['.env.example'])

// `.env`, `.env.local`, `.env.production`, ... (case-insensitive: Windows).
const ENV_NAME = /^\.env(\..+)?$/i

// Concrete names a glob might be aiming at.
const GLOB_CANDIDATES = ['.env', '.env.local', '.env.production', '.env.development']

function basename(p) {
  const norm = String(p).replace(/\\/g, '/')
  const trimmed = norm.replace(/\/+$/, '')
  return trimmed.slice(trimmed.lastIndexOf('/') + 1)
}

function globToRegExp(glob) {
  let out = ''
  for (const ch of glob) {
    if (ch === '*') out += '[^/]*'
    else if (ch === '?') out += '[^/]'
    else out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${out}$`, 'i')
}

/** True when `candidate` (a path, filename, or glob) names a protected .env file. */
function namesEnvFile(candidate) {
  if (typeof candidate !== 'string' || !candidate) return false
  const base = basename(candidate)
  if (!base) return false
  if (ALLOWED.has(base.toLowerCase())) return false
  if (ENV_NAME.test(base)) return true
  // Globs: only a pattern that starts with a literal dot can match a dotfile
  // (`*` alone does not match `.env` in a shell), so `.e*`, `.env*`, `.env.*`.
  if (/[*?]/.test(base) && base.startsWith('.')) {
    const re = globToRegExp(base)
    if (GLOB_CANDIDATES.some((c) => re.test(c))) return true
  }
  // Brace sets: `.env{,.local}` / `{.env,.env.local}`.
  const brace = base.match(/^(.*)\{([^}]*)\}(.*)$/)
  if (brace) {
    return brace[2].split(',').some((alt) => namesEnvFile(`${brace[1]}${alt}${brace[3]}`))
  }
  return false
}

// Split a command into candidate tokens. Quotes, separators, redirections and
// `=` (for --path=.env) all delimit. Backslashes are NOT delimiters.
function commandTokens(command) {
  return String(command).split(/[\s"'`;|&<>(){}=,]+/).filter(Boolean)
}

// The quoted value of a message-style flag is prose, not a path: a commit
// message or PR body that says "block reads of .env files" must not trip the
// hook. Only the quoted value right after these flags is dropped; everything
// else on the line (including `bash -c "cat .env"`) is still scanned.
//   -m / -am (git commit), --message, --body, --title, --notes, -b, -t
const PROSE_FLAG_VALUE =
  /(?:^|\s)(?:-[a-zA-Z]*m|--message|--body|--title|--notes|-b|-t)(?:\s+|=)(?:"(?:[^"\\]|\\.)*"|'[^']*')/g

function commandNamesEnvFile(command) {
  const scanned = String(command).replace(PROSE_FLAG_VALUE, ' ')
  for (const tok of commandTokens(scanned)) {
    if (namesEnvFile(tok)) return tok
  }
  return null
}

/**
 * @param {object} payload hook JSON ({ tool_name, tool_input })
 * @returns {{deny: boolean, target?: string}}
 */
function evaluate(payload) {
  const tool = payload && payload.tool_name
  const input = (payload && payload.tool_input) || {}

  if (tool === 'Bash' || tool === 'PowerShell') {
    const hit = commandNamesEnvFile(input.command)
    return hit ? { deny: true, target: hit } : { deny: false }
  }

  if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') {
    const fields = [input.file_path, input.path, input.glob, input.pattern]
    // Grep's `pattern` is a regex over file CONTENTS, not a path: skip it.
    if (tool === 'Grep') fields.pop()
    for (const f of fields) {
      if (namesEnvFile(f)) return { deny: true, target: f }
    }
  }

  return { deny: false }
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

module.exports = { evaluate, namesEnvFile, commandNamesEnvFile, basename }
