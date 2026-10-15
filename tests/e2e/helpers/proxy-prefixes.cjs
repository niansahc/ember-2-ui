// Path prefixes the Vite dev server proxies to the API. One list, two readers:
// vite.config.js builds its proxy table from it and mock-bootstrap.cjs builds
// the catch-all that absorbs unmocked calls. Adding a prefix here covers both,
// so an unmocked call can no longer leak to the live API through a prefix the
// catch-all did not know about.
module.exports = ['/v1', '/model', '/ingest', '/journal', '/state', '/reflect', '/debug-context']
