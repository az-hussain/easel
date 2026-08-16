#!/usr/bin/env node
/**
 * Export a deck to PDF via headless Chromium.
 *
 * Usage:
 *   npm run export -- <deck-name> [--out path/to/file.pdf] [--no-build]
 *                     [--raster] [--scale N] [--quality N]
 *
 * Behavior:
 *   1. Builds the app (vite build) unless --no-build.
 *   2. Boots `vite preview` on an ephemeral port.
 *   3. Launches Playwright Chromium, navigates to /print/<deck>.
 *   4. Waits for window.__SLIDES_READY, then either:
 *      - default (vector): calls page.pdf with preferCSSPageSize so each
 *        slide prints at its own size (landscape 1920x1080 or portrait
 *        1080x1920) and printBackground=true. Small file, selectable text —
 *        but effects go through Chromium's print pipeline and some viewers
 *        (macOS Preview) mangle box-shadows / textures / repeating gradients.
 *      - --raster: screenshots each .slide-canvas under screen media at
 *        --scale× resolution (default 2× → 3840×2160) and composes the JPEGs
 *        (--quality, default 90) into a PDF with pdf-lib. Pixel-identical to
 *        the browser — shadows, grain, gradients all render exactly as on
 *        the web, and pages paint instantly in every viewer. Trade-off:
 *        text is not selectable and the file is larger.
 *   5. Writes to exports/<deck>.pdf (or --out), cleans up.
 *
 * Designed to be safe to call from a Claude skill — exits non-zero with a
 * useful message if anything fails.
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log('Usage: npm run export -- <deck-name> [--out file.pdf] [--no-build]')
  process.exit(args.length === 0 ? 1 : 0)
}

const deckName = args.find((a) => !a.startsWith('--'))
if (!deckName) {
  console.error('error: missing deck name')
  process.exit(1)
}

const outIdx = args.indexOf('--out')
const outPath =
  outIdx >= 0 && args[outIdx + 1]
    ? resolve(ROOT, args[outIdx + 1])
    : resolve(ROOT, 'exports', `${deckName}.pdf`)

const skipBuild = args.includes('--no-build')
const raster = args.includes('--raster')
const scaleIdx = args.indexOf('--scale')
const rasterScale = scaleIdx >= 0 && args[scaleIdx + 1] ? Number(args[scaleIdx + 1]) : 2
const qualityIdx = args.indexOf('--quality')
const rasterQuality = qualityIdx >= 0 && args[qualityIdx + 1] ? Number(args[qualityIdx + 1]) : 90

if (!existsSync(resolve(ROOT, 'decks', deckName, 'deck.json'))) {
  console.error(`error: decks/${deckName}/deck.json not found`)
  process.exit(1)
}

// --- 1. Build ---------------------------------------------------------------
if (!skipBuild) {
  console.log('▸ building app…')
  await runCmd('npx', ['vite', 'build'], { cwd: ROOT })
}

// --- 2. Preview server ------------------------------------------------------
const port = await pickPort()
console.log(`▸ starting preview on :${port}`)
const previewProc = spawn(
  'npx',
  ['vite', 'preview', '--port', String(port), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
)

let previewKilled = false
const killPreview = () => {
  if (previewKilled) return
  previewKilled = true
  try { previewProc.kill('SIGTERM') } catch {}
}
process.on('SIGINT', () => { killPreview(); process.exit(130) })
process.on('SIGTERM', () => { killPreview(); process.exit(143) })

await waitForServer(`http://localhost:${port}`, 30_000)

// --- 3. Playwright ----------------------------------------------------------
let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  killPreview()
  console.error('error: playwright is not installed. Run `npm install` and `npx playwright install chromium`.')
  process.exit(1)
}

console.log('▸ launching headless chromium')
const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: raster ? rasterScale : 1,
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('  page error:', e.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('  console error:', msg.text())
  })

  const url = `http://localhost:${port}/print/${encodeURIComponent(deckName)}`
  console.log(`▸ navigating to ${url}`)
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__SLIDES_READY === true, { timeout: 30_000 })

  await mkdir(dirname(outPath), { recursive: true })

  if (raster) {
    // Raster mode: screenshot every slide under screen media (so shadows,
    // textures and gradients render exactly as in the browser) and compose
    // the images into a PDF. Page size matches the vector export: CSS px
    // × 0.75 = PDF points.
    console.log(`▸ rasterizing slides at ${rasterScale}× → ${outPath}`)
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    const canvases = await page.$$('.slide-canvas')
    if (canvases.length === 0) throw new Error('no .slide-canvas elements found on print route')
    for (const canvas of canvases) {
      const box = await canvas.boundingBox()
      if (!box) continue
      const jpg = await canvas.screenshot({ type: 'jpeg', quality: rasterQuality })
      const img = await doc.embedJpg(jpg)
      const w = box.width * 0.75
      const h = box.height * 0.75
      const pdfPage = doc.addPage([w, h])
      pdfPage.drawImage(img, { x: 0, y: 0, width: w, height: h })
    }
    await writeFile(outPath, await doc.save())
  } else {
    console.log(`▸ rendering PDF → ${outPath}`)
    // preferCSSPageSize lets each slide pick its own page size via named @page
    // rules (landscape 1920×1080 / portrait 1080×1920), so a deck can mix both.
    await page.pdf({
      path: outPath,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    })
  }
} finally {
  await browser.close()
  killPreview()
}

console.log(`✓ wrote ${outPath}`)

// --- helpers ----------------------------------------------------------------

function runCmd(cmd, args, opts) {
  return new Promise((resolveP, rejectP) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts })
    p.on('exit', (code) => (code === 0 ? resolveP() : rejectP(new Error(`${cmd} exited ${code}`))))
    p.on('error', rejectP)
  })
}

async function pickPort() {
  const net = await import('node:net')
  return new Promise((res, rej) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', rej)
    srv.listen(0, () => {
      const { port } = srv.address()
      srv.close(() => res(port))
    })
  })
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url)
      if (r.ok || r.status === 404) return
    } catch {}
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`preview server never came up at ${url}`)
}
