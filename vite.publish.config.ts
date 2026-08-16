import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Build config for `npm run publish`. Renders only a single deck.
 *
 * Driven by env vars set by scripts/publish.mjs:
 *   VITE_PUBLISH_DECK   the deck name (also baked into the bundle)
 *   PUBLISH_OUT_DIR     output directory, e.g. dist/publish/<deck>
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    outDir: process.env.PUBLISH_OUT_DIR || 'dist/publish/unknown',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'publish.html'),
    },
  },
})
