import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendProxy = {
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
  cookieDomainRewrite: '',
  cookiePathRewrite: '/',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/predict': backendProxy,
      '/classify-bulk': backendProxy,
      '/health': backendProxy,
      '/random-question': backendProxy,
      '/api': backendProxy,
      '/admin': backendProxy,
      '/subscription': backendProxy,
      '/upgrade-subscription': backendProxy,
      '/auth': backendProxy,
    }
  }
})
