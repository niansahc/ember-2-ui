#!/usr/bin/env node
/**
 * build-with-key.js — production build wrapper.
 *
 * Pulls the Ember-2 API key out of the system keyring (where set_api_key.py
 * stored it), bakes it into the Vite bundle as VITE_EMBER_API_KEY, runs
 * `vite build`, and copies the resulting dist/ into ../ember-2/ui/ so the
 * FastAPI backend picks it up on its next request.
 *
 * Why this exists:
 *   The old auth path injected `<script>window.__EMBER_API_KEY__=...</script>`
 *   into the served HTML at request time. That broke under CSP
 *   `script-src 'self'` (no 'unsafe-inline'), which the backend now sets,
 *   and it never worked for partner-install scenarios where the UI is
 *   served from a different origin than the backend. Baking the key at
 *   build time eliminates both problems — the running bundle has the key
 *   directly, no inline script, no cross-origin assumption.
 *
 * Key resolution order (first hit wins):
 *   1. EMBER_API_KEY environment variable — useful for CI / overrides
 *   2. System keyring under service "ember-2" / username "api_key" —
 *      read via the ember-2 backend venv's python (it already has the
 *      `keyring` package). Same source set_api_key.py writes to.
 *   3. .env file VITE_EMBER_API_KEY=... — last-resort fallback for dev
 *      machines that haven't run set_api_key.py yet.
 *   4. Hard error with actionable instructions.
 *
 * Usage:
 *   npm run build                # default — full pipeline
 *   node scripts/build-with-key.js
 *
 * No arguments. Exits non-zero on any failure.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, cpSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const DIST_DIR = resolve(REPO_ROOT, 'dist')
const ENV_FILE = resolve(REPO_ROOT, '.env')

// The backend repo lives next door. Its venv has the keyring library
// already installed; reusing it avoids forcing UI contributors to install
// a Python keyring shim of their own.
const BACKEND_ROOT = resolve(REPO_ROOT, '..', 'ember-2')
const BACKEND_UI_DIR = resolve(BACKEND_ROOT, 'ui')
const VENV_PYTHON = process.platform === 'win32'
  ? resolve(BACKEND_ROOT, '.venv', 'Scripts', 'python.exe')
  : resolve(BACKEND_ROOT, '.venv', 'bin', 'python')

const KEYRING_SERVICE = 'ember-2'
const KEYRING_USERNAME = 'api_key'

function log(msg) {
  // Matches the visual cadence of vite's own output so the lines blend.
  console.log(`\x1b[36m[build-with-key]\x1b[0m ${msg}`)
}

function fatal(msg) {
  console.error(`\x1b[31m[build-with-key] ${msg}\x1b[0m`)
  process.exit(1)
}

/** Read the key from EMBER_API_KEY in the calling shell. */
function fromEnvVar() {
  const v = process.env.EMBER_API_KEY
  return v && v.trim() ? v.trim() : null
}

/**
 * Read the key out of the system credential store via the backend venv's
 * python + keyring package. Returns null if any step fails — we fall
 * through to the next source rather than blowing up here.
 */
function fromKeyring() {
  if (!existsSync(VENV_PYTHON)) {
    log(`venv python not found at ${VENV_PYTHON} — skipping keyring lookup`)
    return null
  }
  const probe = spawnSync(
    VENV_PYTHON,
    [
      '-c',
      "import keyring,sys;v=keyring.get_password('" +
        KEYRING_SERVICE + "','" + KEYRING_USERNAME + "');" +
        "sys.stdout.write(v or '')",
    ],
    { encoding: 'utf-8' },
  )
  if (probe.status !== 0) {
    log(`keyring lookup exited ${probe.status}: ${(probe.stderr || '').trim()}`)
    return null
  }
  const v = (probe.stdout || '').trim()
  return v || null
}

/** Last-resort: parse .env for VITE_EMBER_API_KEY=... */
function fromDotEnv() {
  if (!existsSync(ENV_FILE)) return null
  try {
    const content = readFileSync(ENV_FILE, 'utf-8')
    const m = content.match(/^VITE_EMBER_API_KEY=(.+)$/m)
    return m ? m[1].trim() : null
  } catch {
    return null
  }
}

function resolveKey() {
  for (const [name, fn] of [
    ['EMBER_API_KEY env var', fromEnvVar],
    ['system keyring', fromKeyring],
    ['.env file', fromDotEnv],
  ]) {
    const v = fn()
    if (v) {
      log(`using API key from ${name}`)
      return v
    }
  }
  fatal(
    'No API key found in EMBER_API_KEY, system keyring, or .env.\n' +
    'Run `python scripts/set_api_key.py` in the ember-2 repo to generate one.',
  )
}

function runViteBuild(apiKey) {
  log('running `vite build` with VITE_EMBER_API_KEY baked in')
  // Invoke vite's JS entry directly with the current node binary instead of
  // shelling through `npx vite`. Two reasons:
  //   1. Node 24 on Windows refuses to spawn .cmd files via execFileSync
  //      (EINVAL) unless you opt into shell:true, which then requires
  //      shell-escaping the args. Calling node + a .js file sidesteps the
  //      whole .cmd path.
  //   2. Skipping npm/npx removes a 200ms+ startup tax on every build.
  // Passing the key via env (not argv) keeps it out of the process list.
  const viteBin = resolve(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!existsSync(viteBin)) {
    fatal(`vite bin not found at ${viteBin} — did npm install run?`)
  }
  execFileSync(
    process.execPath,
    [viteBin, 'build'],
    {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: { ...process.env, VITE_EMBER_API_KEY: apiKey },
    },
  )
}

function copyDistToBackend() {
  if (!existsSync(BACKEND_UI_DIR)) {
    log(`creating ${BACKEND_UI_DIR}`)
    mkdirSync(BACKEND_UI_DIR, { recursive: true })
  } else {
    // Wipe stale assets so old hashed filenames don't accumulate. Without
    // this, the ui/ directory grows by one entry per build forever.
    log(`clearing ${BACKEND_UI_DIR}`)
    rmSync(BACKEND_UI_DIR, { recursive: true, force: true })
    mkdirSync(BACKEND_UI_DIR, { recursive: true })
  }
  log(`copying dist/ → ${BACKEND_UI_DIR}`)
  cpSync(DIST_DIR, BACKEND_UI_DIR, { recursive: true })
}

function main() {
  const apiKey = resolveKey()
  runViteBuild(apiKey)
  if (!existsSync(DIST_DIR)) fatal(`vite build produced no ${DIST_DIR}`)
  copyDistToBackend()
  log('done')
}

main()
