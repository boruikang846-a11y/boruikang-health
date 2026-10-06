import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// User-app SPA build config.
// base '/', assetsDir 'assets' — the product is served by boruikang-health-user Spring Boot from
// the root path. The dev server proxies /boruikang to the user backend on port 8081.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    open: false,
    port: 3002,
    proxy: {
      '/boruikang': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
      '/downloads': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
    },
  },
})
