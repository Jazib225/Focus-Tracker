import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use relative base for production so Electron can load from file://
  base: command === 'build' ? './' : '/',
  optimizeDeps: {
    exclude: ['@mediapipe/face_mesh'],
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer (used by some WASM modules)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
}))
