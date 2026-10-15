// Playwright global teardown — runs once after all tests, including after
// failures and Ctrl+C (Playwright's own graceful stop). A hard kill skips it;
// the record file left behind is picked up by the next setup, or run
// `npm run e2e:restore`.
//
// Restores the label recorded at setup (never a hardcoded name), retrying
// 429s with backoff, then verifies. Any failure is loud: boxed message and a
// failing exit code, not a warning.

const { makeDeps, NO_BACKEND } = require('./helpers/vault-runtime.cjs')
const { runTeardown } = require('./helpers/vault-swap.cjs')

module.exports = async () => {
  if (NO_BACKEND) return
  const { ctx, deps } = await makeDeps()
  try {
    await runTeardown(deps)
  } catch (err) {
    const bar = '!'.repeat(72)
    console.error(`\n${bar}\n[global-teardown] VAULT NOT RESTORED\n${err.message}\n${bar}\n`)
    process.exitCode = 1
    throw err
  } finally {
    await ctx.dispose()
  }
}
