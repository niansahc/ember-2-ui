// Tests for .claude/hooks/block-env-reads.cjs. Synthetic tool-call JSON only:
// no real .env is read, and none of these paths has to exist. Windows paths use
// String.raw so the backslashes reach the hook exactly as a Windows session
// would send them.
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import hook from '../../.claude/hooks/block-env-reads.cjs'

const { evaluate } = hook
const HOOK_PATH = fileURLToPath(new URL('../../.claude/hooks/block-env-reads.cjs', import.meta.url))

const call = (tool_name, tool_input) => ({ tool_name, tool_input })
const denied = (tool, input) => evaluate(call(tool, input)).deny

const READ_DENY = [
  ['windows absolute', String.raw`C:\dev\Ember-2\ember-2-ui\.env`],
  ['windows forward slashes', 'C:/dev/Ember-2/ember-2-ui/.env'],
  ['windows lowercase drive', String.raw`c:\dev\ember-2-ui\.env`],
  ['windows relative', String.raw`.\.env`],
  ['windows parent', String.raw`..\.env`],
  ['posix absolute', '/home/user/ember-2-ui/.env'],
  ['git-bash style', '/c/dev/Ember-2/ember-2-ui/.env'],
  ['bare name', '.env'],
  ['.env.local', String.raw`C:\dev\Ember-2\ember-2-ui\.env.local`],
  ['.env.production posix', '/srv/app/.env.production'],
  ['upper case (Windows is case-insensitive)', String.raw`C:\dev\x\.ENV`],
]

const READ_ALLOW = [
  ['.env.example windows', String.raw`C:\dev\Ember-2\ember-2-ui\.env.example`],
  ['.env.example posix', '/home/user/ember-2-ui/.env.example'],
  ['.env.example bare', '.env.example'],
  ['source file windows', String.raw`C:\dev\Ember-2\ember-2-ui\src\App.jsx`],
  ['source file posix', '/home/user/ember-2-ui/src/App.jsx'],
  ['name containing env', String.raw`C:\dev\x\src\environment.js`],
  ['dotfile that is not .env', String.raw`C:\dev\x\.envrc-notes.md`],
  ['directory named like env', String.raw`C:\dev\x\env\config.json`],
]

describe('Read', () => {
  it.each(READ_DENY)('denies %s', (_label, file_path) => {
    expect(denied('Read', { file_path })).toBe(true)
  })

  it.each(READ_ALLOW)('allows %s', (_label, file_path) => {
    expect(denied('Read', { file_path })).toBe(false)
  })

  // Positive control: without it every "allows" case above would also pass
  // for a hook that never denies anything.
  it('CONTROL: the same code path that allows App.jsx denies .env', () => {
    expect(denied('Read', { file_path: String.raw`C:\dev\x\src\App.jsx` })).toBe(false)
    expect(denied('Read', { file_path: String.raw`C:\dev\x\.env` })).toBe(true)
  })
})

describe('Grep', () => {
  it('denies a .env path (windows)', () => {
    expect(denied('Grep', { pattern: 'KEY', path: String.raw`C:\dev\x\.env` })).toBe(true)
  })
  it('denies a .env path (posix)', () => {
    expect(denied('Grep', { pattern: 'KEY', path: '/c/dev/x/.env' })).toBe(true)
  })
  it('denies a glob aimed at .env files', () => {
    expect(denied('Grep', { pattern: 'KEY', glob: '.env*' })).toBe(true)
    expect(denied('Grep', { pattern: 'KEY', glob: '**/.env.*' })).toBe(true)
  })
  it('allows a normal search', () => {
    expect(denied('Grep', { pattern: 'useChat', path: String.raw`C:\dev\x\src`, glob: '*.jsx' })).toBe(false)
  })
  it('allows a content pattern that merely says .env (it is a regex over contents, not a path)', () => {
    expect(denied('Grep', { pattern: String.raw`\.env`, path: String.raw`C:\dev\x\src` })).toBe(false)
  })
  it('allows .env.example', () => {
    expect(denied('Grep', { pattern: 'VITE', path: String.raw`C:\dev\x\.env.example` })).toBe(false)
  })
  it('CONTROL: the content-pattern case flips to deny once the path is .env', () => {
    expect(denied('Grep', { pattern: String.raw`\.env`, path: String.raw`C:\dev\x\.env` })).toBe(true)
  })
})

describe('Glob', () => {
  it.each([
    '**/.env',
    '.env*',
    '**/.env.*',
    '.env.local',
    String.raw`C:\dev\x\.env`,
    '/c/dev/x/.env*',
    '.e*',
    '.env{,.local}',
  ])('denies pattern %s', (pattern) => {
    expect(denied('Glob', { pattern })).toBe(true)
  })

  it.each([
    '**/*.jsx',
    'src/**/*.js',
    '**/.env.example',
    '*',
    '**/*',
    String.raw`C:\dev\x\src\**\*.jsx`,
  ])('allows pattern %s', (pattern) => {
    expect(denied('Glob', { pattern })).toBe(false)
  })

  it('denies when only the base path is a .env file', () => {
    expect(denied('Glob', { pattern: '*', path: String.raw`C:\dev\x\.env` })).toBe(true)
  })

  it('CONTROL: a glob that allows *.jsx denies .env*', () => {
    expect(denied('Glob', { pattern: '**/*.jsx' })).toBe(false)
    expect(denied('Glob', { pattern: '**/.env*' })).toBe(true)
  })
})

describe.each(['Bash', 'PowerShell'])('%s', (tool) => {
  const DENY = [
    'cat .env',
    'cat .env.local',
    'type .env',
    String.raw`type C:\dev\Ember-2\ember-2-ui\.env`,
    String.raw`type "C:\dev\Ember-2\ember-2-ui\.env"`,
    String.raw`type 'C:\dev\Ember-2\ember-2-ui\.env'`,
    String.raw`Get-Content .\.env`,
    String.raw`Get-Content -Path "C:\dev\x\.env"`,
    String.raw`Get-Content -Path=.\.env`,
    'gc .env',
    'cat /c/dev/Ember-2/ember-2-ui/.env',
    'sed -n 1,5p .env',
    'head -n 3 .env.local',
    'tail -c 200 .env | xxd',
    'grep KEY .env',
    String.raw`grep -r KEY C:\dev\x\.env`,
    String.raw`findstr KEY C:\dev\x\.env`,
    String.raw`C:\Windows\System32\more.com C:\x\.env`,
    'awk "{print}" .env',
    'cat < .env',
    'echo hi && cat .env',
    'cat .env*',
    'cat .e*',
    'cat .env{,.local}',
    'cat ./config/.env.production',
    String.raw`$k = Get-Content .env; $k`,
    // Prose flags are skipped, but only their own quoted value.
    'git commit -m "wip" && cat .env',
    'grep -m 1 KEY .env',
    'bash -c "cat .env"',
    'gh pr create --title "x" --body "y" && type .env',
  ]

  const ALLOW = [
    'cat .env.example',
    String.raw`type C:\dev\Ember-2\ember-2-ui\.env.example`,
    'git add .env.example',
    'git status',
    'npm run build',
    'npx playwright test --workers=2',
    'ls src',
    String.raw`Get-Content C:\dev\x\src\App.jsx`,
    'cat src/App.jsx',
    'grep -rn useChat src',
    'node -e "console.log(process.env.NODE_ENV)"',
    'echo environment',
    'cat *',
    'git commit -m "chore: block env reads"',
    // The required commit message and PR text mention .env as prose.
    'git commit -m "chore(security): block agent reads of .env files"',
    'git commit -am "stop printing .env contents"',
    "git commit -m 'document .env handling'",
    'git commit --message="never cat .env"',
    'gh pr create --title "block .env reads" --body "denies cat .env and type .env"',
  ]

  it.each(DENY)('denies: %s', (command) => {
    expect(denied(tool, { command })).toBe(true)
  })

  it.each(ALLOW)('allows: %s', (command) => {
    expect(denied(tool, { command })).toBe(false)
  })

  it('CONTROL: `cat src/App.jsx` is allowed and `cat .env` is denied by the same path', () => {
    expect(denied(tool, { command: 'cat src/App.jsx' })).toBe(false)
    expect(denied(tool, { command: 'cat .env' })).toBe(true)
  })
})

describe('other tools and shapes', () => {
  it('ignores tools it does not cover', () => {
    expect(denied('Edit', { file_path: String.raw`C:\dev\x\.env` })).toBe(false)
    expect(denied('WebFetch', { url: 'https://example.com/.env' })).toBe(false)
  })
  it('tolerates a payload with no tool_input', () => {
    expect(evaluate({ tool_name: 'Read' }).deny).toBe(false)
    expect(evaluate({}).deny).toBe(false)
  })
})

describe('as the harness runs it (stdin JSON, stdout decision)', () => {
  const run = (stdin) => spawnSync(process.execPath, [HOOK_PATH], { input: stdin, encoding: 'utf8' })

  it('writes a deny decision with a reason that names the target but no contents', () => {
    const r = run(JSON.stringify(call('Read', { file_path: String.raw`C:\dev\x\.env` })))
    expect(r.status).toBe(0)
    const out = JSON.parse(r.stdout)
    expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out.hookSpecificOutput.permissionDecisionReason).toMatch(/reading \.env files is not allowed/)
  })

  it('CONTROL: writes nothing for an unrelated file', () => {
    const r = run(JSON.stringify(call('Read', { file_path: String.raw`C:\dev\x\src\App.jsx` })))
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
  })

  it('allows through, with a note on stderr, when the payload is not JSON', () => {
    const r = run('not json')
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
    expect(r.stderr).toMatch(/unparseable hook payload/)
  })
})
