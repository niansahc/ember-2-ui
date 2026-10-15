// Playwright global setup — runs once before any test.
//
// Records the active vault label, then swaps the backend to the 'test' vault.
// Fails loudly (does not run the suite) if the swap cannot be made or cannot be
// verified, or if the backend is already on 'test' with no record of where to
// restore. See helpers/vault-swap.cjs for the logic and its unit tests.

const { makeDeps, NO_BACKEND } = require('./helpers/vault-runtime.cjs')
const { runSetup } = require('./helpers/vault-swap.cjs')

module.exports = async () => {
  if (NO_BACKEND) {
    console.log('[global-setup] EMBER_E2E_NO_BACKEND set: skipping vault guard.')
    return
  }
  const { ctx, deps } = await makeDeps()
  try {
    await runSetup(deps)
  } finally {
    await ctx.dispose()
  }
}
