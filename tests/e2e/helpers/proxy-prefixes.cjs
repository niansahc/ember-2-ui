// Path prefixes the Vite dev server proxies to the API. One list, two readers:
// vite.config.js builds its proxy table from it and mock-bootstrap.cjs builds
// the catch-all that absorbs unmocked calls. Adding a prefix here covers both,
// so an unmocked call can no longer leak to the live API through a prefix the
// catch-all did not know about.
// tests/unit/proxy-prefixes.test.js derives the paths src/api/ember.js calls and
// fails when one is missing here.
module.exports = [
  '/v1',
  '/api',
  '/model',
  '/provider-key',
  '/ingest',
  '/journal',
  '/state',
  '/reflect',
  '/debug-context',
  '/write-memory',
  '/write-state',
  '/read-memories',
  '/search-memories',
  '/semantic-search',
]
