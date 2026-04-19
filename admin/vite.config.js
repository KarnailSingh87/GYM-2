import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173
  },
  build: {
    target: 'esnext', // Modern browsers, less polyfill weight
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          recharts: ['recharts'],
          icons: ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})
