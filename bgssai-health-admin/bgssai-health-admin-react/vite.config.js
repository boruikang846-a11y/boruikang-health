import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Admin console SPA build config.
// base '/', assetsDir 'assets' — the product is served by bgssai-health-admin Spring Boot from
// the root path. The dev server proxies /bgssai to the admin backend on port 8080.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    open: false,
    port: 3001,
    proxy: {
      '/bgssai': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
