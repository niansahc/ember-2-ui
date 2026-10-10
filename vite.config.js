import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = 'http://localhost:8000'

// The backend 403s any POST/PUT/PATCH/DELETE whose Origin is not its own
// host (ember-2 #282, DNS-rebinding guard). The browser stamps the dev
// server's origin (localhost:3000) on those requests, so every proxied call
// gets its Origin rewritten to the target before it leaves the proxy.
// changeOrigin already handles the Host header; it does not touch Origin.
// Requests without an Origin are left alone — no header is invented.
function apiProxy() {
  return {
    target: API_TARGET,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        if (proxyReq.getHeader('origin')) {
          proxyReq.setHeader('origin', API_TARGET)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Loopback only. The dev server proxies straight into the API, so
    // exposing it on the LAN would hand the network a way around the
    // backend's Host/Origin checks.
    host: 'localhost',
    open: true,
    proxy: {
      // Proxy API calls to the Ember backend — same-origin from the browser's view
      '/v1': apiProxy(),
      '/model': apiProxy(),
      '/ingest': apiProxy(),
      '/journal': apiProxy(),
      '/state': apiProxy(),
      '/reflect': apiProxy(),
      '/debug-context': apiProxy(),
    },
  },
})
