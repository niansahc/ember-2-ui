import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy API calls to the Ember backend — avoids CORS in development
      '/v1': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/model': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/ingest': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/journal': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/state': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/reflect': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/debug-context': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
