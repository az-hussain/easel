import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'

// Deck names are kebab-case (enforced by scripts/create-deck.mjs). Validate
// before interpolating into a subprocess arg — this middleware spawns node.
const DECK_RE = /^[a-z0-9][a-z0-9-]*$/

/**
 * POST /__export/<deck> → runs the real Playwright export and streams back the
 * PDF bytes, so the viewer's Export button produces a byte-identical artifact
 * to `npm run export -- <deck>`.
 *
 * Dev-server only (`apply: 'serve'`): there is no backend in this app, so a
 * published deck has nothing to spawn Playwright with. The Export button is
 * gated behind !IS_PUBLISH to match.
 *
 * Shells out to scripts/export-pdf.mjs rather than reimplementing it — that
 * script stays the single source of truth for the print pipeline.
 */
function exportPdfPlugin(): Plugin {
  return {
    name: 'easel-export-pdf',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'POST' || !req.url?.startsWith('/__export/')) return next()

        const deck = decodeURIComponent(req.url.slice('/__export/'.length).split(/[?#]/)[0])
        if (!DECK_RE.test(deck)) {
          res.statusCode = 400
          res.end('invalid deck name')
          return
        }

        void (async () => {
          // Export to a temp file so the user's chosen save location is the
          // only output — this must not clobber exports/<deck>.pdf.
          const dir = await mkdtemp(path.join(os.tmpdir(), 'easel-export-'))
          const out = path.join(dir, `${deck}.pdf`)
          try {
            await new Promise<void>((resolve, reject) => {
              const child = spawn(
                process.execPath,
                [path.resolve(__dirname, 'scripts/export-pdf.mjs'), deck, '--out', out],
                { cwd: __dirname, stdio: ['ignore', 'inherit', 'pipe'] },
              )
              let stderr = ''
              child.stderr.on('data', (c) => {
                stderr += c
                process.stderr.write(c)
              })
              child.on('error', reject)
              child.on('close', (code) =>
                code === 0
                  ? resolve()
                  : reject(new Error(stderr.trim() || `export exited ${code}`)),
              )
            })
            const pdf = await readFile(out)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Length', pdf.byteLength)
            res.end(pdf)
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'text/plain')
            res.end(err instanceof Error ? err.message : 'export failed')
          } finally {
            await rm(dir, { recursive: true, force: true })
          }
        })()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), exportPdfPlugin()],
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname)],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
