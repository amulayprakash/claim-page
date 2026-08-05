import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import fs from 'fs'

// Copy files immediately on module load
try {
  const srcDir = 'C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\2133f139-c1df-4d00-bb80-593fdcfde172'
  const publicDir = path.resolve(__dirname, 'public')
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  const files = [
    ['feature_cashout_graphic_1785918757085.png', 'feature_cashout.png'],
    ['feature_transparency_graphic_1785918793819.png', 'feature_transparency.png'],
    ['usbt_hero_graphic_1785914036498.png', 'usbt_hero.png']
  ]
  files.forEach(([src, dest]) => {
    const srcPath = path.join(srcDir, src)
    const destPath = path.join(publicDir, dest)
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath)
      console.log(`Successfully copied ${src} -> public/${dest}`)
    }
  })
} catch (err) {
  console.error('Error copying images:', err)
}

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
