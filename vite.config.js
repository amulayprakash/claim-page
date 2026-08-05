import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      globals: { Buffer: true, process: true, global: true },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    fs: {
      allow: [
        '..',
        'C:/Users/ASUS/.gemini/antigravity-ide/brain/2133f139-c1df-4d00-bb80-593fdcfde172'
      ]
    }
  }
})
