# e2e vault swap-back and unmocked-request measurement

## Swap-back

See the addendum in `docs/adr/0001-ui-test-backend-boundary.md`.

| Situation | Behavior |
| --- | --- |
| Backend on vault X (not `test`), dev mode on | Record X, swap to `test`, verify. Teardown restores X, verifies. |
| Backend on `test`, record file present | Keep the recorded label; teardown restores it. |
| Backend on `test`, no record | Setup fails. Rerun with `EMBER_RESTORE_VAULT=<label>`. |
| Run hard-killed (no teardown) | `npm run e2e:restore` (reads `.e2e-vault-original.json`). |
| Restore not verified | Boxed error, exit code 1, the exact curl to run. |

## Measuring requests that would reach the live API

Nothing here touches `:8000`.

1. Start Vite on another port with the proxy pointed at a dead port and logging on:
   `EMBER_API_TARGET=http://127.0.0.1:9 EMBER_PROXY_LOG=<file> npx vite --port 3100 --strictPort`
2. `EMBER_E2E_NO_BACKEND=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test --workers=2`
   (PowerShell). `EMBER_E2E_NO_BACKEND` skips the vault setup/teardown.
3. Each line of `<file>` is one request that reached the proxy.

Result on 2026-10-14 (default lane, 2 workers):

| | Requests to proxy | Peak per 60s | Dominant |
| --- | --- | --- | --- |
| Before catch-all | 508 | 208 | 374 GET /v1/developer/status, 110 GET /v1/system/disk-encryption |
| After | 1 | 1 | 1 PATCH /v1/preferences (a spec-level `route.continue()`) |
