import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  let outDir = 'dist'
  if (mode === 'production') {
    outDir = '../bdl-leads-pro-live'
  } else if (mode === 'staging') {
    outDir = '../bdl-leads-pro-staging'
  }

  return {
    plugins: [react()],
    base: './',
    build: {
      outDir: outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: 'index.html'
      }
    }
  }
})