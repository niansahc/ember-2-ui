// Manual restore after a hard-killed e2e run: reads .e2e-vault-original.json
// and swaps the live API back to the recorded vault, then verifies.
//   npm run e2e:restore
// If the backend is on 'test' with no record, set EMBER_RESTORE_VAULT=<label>.

const { makeDeps } = require('../tests/e2e/helpers/vault-runtime.cjs')
const { runTeardown } = require('../tests/e2e/helpers/vault-swap.cjs')

;(async () => {
  const { ctx, deps } = await makeDeps()
  try {
    await runTeardown(deps)
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
  } finally {
    await ctx.dispose()
  }
})()
