#!/usr/bin/env node
/**
 * Publish a deck to Cloudflare Pages as a self-contained static SPA.
 *
 * Usage:
 *   npm run publish -- <deck-name> [--yes] [--prefix <p>]
 *
 * Flow:
 *   1. Validate the deck exists.
 *   2. Confirm with the user (unless --yes).
 *   3. Ensure wrangler is authenticated.
 *   4. Build the single-deck SPA via vite.publish.config.ts.
 *   5. Deploy via `wrangler pages deploy`.
 *   6. Record URL in .easel/published.json.
 *
 * Notes:
 *   - The project name is `<prefix>-<deck>` (default prefix from .easel/config.json).
 *   - Pages.dev subdomains are public-by-default. Don't publish confidential decks.
 *   - First-time setup: run `npx wrangler login` once.
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PUBLISHED_PATH = resolve(ROOT, '.easel/published.json')
const CONFIG_PATH = resolve(ROOT, '.easel/config.json')

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log('Usage: npm run publish -- <deck-name> [--yes] [--prefix <p>]')
  process.exit(args.length === 0 ? 1 : 0)
}

const yes = args.includes('--yes') || args.includes('-y')
const deckName = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--prefix')
if (!deckName) {
  console.error('error: missing deck name')
  process.exit(1)
}

const prefixArg = args.indexOf('--prefix') >= 0 ? args[args.indexOf('--prefix') + 1] : undefined

// --- 1. Validate deck -------------------------------------------------------
const manifestPath = resolve(ROOT, 'decks', deckName, 'deck.json')
if (!existsSync(manifestPath)) {
  console.error(`error: decks/${deckName}/deck.json not found`)
  process.exit(1)
}
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (!Array.isArray(manifest.slides) || manifest.slides.length === 0) {
  console.error(`error: deck "${deckName}" has no slides`)
  process.exit(1)
}

// --- 2. Resolve config + project name --------------------------------------
let config = { host: 'cloudflare-pages', projectPrefix: 'easel' }
try {
  config = { ...config, ...JSON.parse(await readFile(CONFIG_PATH, 'utf8')) }
} catch {}
const prefix = prefixArg ?? config.projectPrefix
const projectName = sanitize(`${prefix}-${deckName}`)

console.log(`\n  Deck:        ${manifest.title} (${deckName})`)
console.log(`  Slides:      ${manifest.slides.length}`)
console.log(`  Host:        Cloudflare Pages`)
console.log(`  Project:     ${projectName}`)
console.log(`  URL:         https://${projectName}.pages.dev`)
console.log(`\n  ⚠ pages.dev URLs are public. Don't publish confidential decks.\n`)

if (!yes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ans = (await rl.question('Continue? [y/N] ')).trim().toLowerCase()
  rl.close()
  if (ans !== 'y' && ans !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }
}

// --- 3. Check wrangler auth -------------------------------------------------
console.log('▸ checking wrangler auth…')
const whoami = spawnSync('npx', ['wrangler', 'whoami'], { cwd: ROOT, encoding: 'utf8' })
if (whoami.status !== 0 && !process.env.CLOUDFLARE_ACCOUNT_ID) {
  console.error('error: wrangler is not authenticated.')
  console.error('       Run `npx wrangler login` once and try again.')
  console.error('       (Or set CLOUDFLARE_ACCOUNT_ID to skip the account auto-detect.)')
  process.exit(1)
}
if (whoami.status !== 0) {
  console.log('  whoami account auto-detect failed; using CLOUDFLARE_ACCOUNT_ID')
}

// --- 4. Build ---------------------------------------------------------------
const outDir = resolve(ROOT, 'dist/publish', deckName)
console.log(`▸ building single-deck bundle → ${outDir.replace(ROOT + '/', '')}`)
await runCmd('npx', ['vite', 'build', '--config', 'vite.publish.config.ts'], {
  cwd: ROOT,
  env: { ...process.env, VITE_PUBLISH_DECK: deckName, PUBLISH_OUT_DIR: outDir },
})

// The build emits publish.html but CF Pages expects index.html. Copy it.
const publishHtml = resolve(outDir, 'publish.html')
const indexHtml = resolve(outDir, 'index.html')
if (existsSync(publishHtml)) {
  await writeFile(indexHtml, await readFile(publishHtml))
}

// --- 5a. Ensure project exists ----------------------------------------------
// If a previous publish recorded a project name for this deck, reuse it.
// Otherwise compute one. If that name is taken on CF, append a random suffix.
let existingPublished = {}
try { existingPublished = JSON.parse(await readFile(PUBLISHED_PATH, 'utf8')) } catch {}

let effectiveProjectName = existingPublished[deckName]?.projectName ?? projectName

console.log(`▸ ensuring CF Pages project "${effectiveProjectName}" exists`)
const projectList = await withRetry(() =>
  runCmdSyncCapture('npx', ['wrangler', 'pages', 'project', 'list'], { cwd: ROOT }),
  { tries: 2, label: 'list projects' },
)
const projectExists = projectList.includes(effectiveProjectName)

if (!projectExists) {
  effectiveProjectName = await createProjectWithCollisionFallback(effectiveProjectName)
}

// --- 5b. Deploy -------------------------------------------------------------
console.log(`▸ deploying to Cloudflare Pages (${effectiveProjectName})`)
const deploy = await withRetry(
  () =>
    runCmdCapture(
      'npx',
      ['wrangler', 'pages', 'deploy', outDir, '--project-name', effectiveProjectName, '--branch', 'main'],
      { cwd: ROOT },
    ),
  { tries: 2, label: 'deploy' },
)

async function createProjectWithCollisionFallback(name) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const tryName = attempt === 0 ? name : `${name}-${randomBytes(2).toString('hex')}`
    console.log(`  creating project ${tryName} ${attempt > 0 ? '(name collision fallback)' : '(one-time)'}`)
    try {
      await withRetry(
        () =>
          runCmdCapture(
            'npx',
            ['wrangler', 'pages', 'project', 'create', tryName, '--production-branch', 'main'],
            { cwd: ROOT },
          ),
        { tries: 2, label: 'create project' },
      )
      return tryName
    } catch (err) {
      const msg = String(err.message ?? err)
      const looksLikeNameTaken =
        msg.includes('already exists') ||
        msg.includes('name is not available') ||
        msg.includes('subdomain is not available')
      if (!looksLikeNameTaken) throw err
      console.log(`  ⚠ "${tryName}" is taken on Cloudflare Pages — trying a new name`)
    }
  }
  throw new Error('Could not find an available CF Pages project name after 3 attempts')
}

// Parse URL from wrangler output. Wrangler prints a line like:
//   ✨ Deployment complete! Take a peek over at https://abc.easel-foo.pages.dev
const urlMatch = deploy.match(/https?:\/\/[\w.-]+\.pages\.dev/g)
if (!urlMatch || urlMatch.length === 0) {
  console.error('error: could not parse deployment URL from wrangler output')
  console.error(deploy)
  process.exit(1)
}
// Prefer the canonical project URL (no deployment-hash prefix) over preview URLs.
const canonical = urlMatch.find((u) => u === `https://${effectiveProjectName}.pages.dev`)
const liveUrl = canonical ?? `https://${effectiveProjectName}.pages.dev`

// --- 6. Record --------------------------------------------------------------
let published = {}
try { published = JSON.parse(await readFile(PUBLISHED_PATH, 'utf8')) } catch {}

const publishedBy = getGitUser()
published[deckName] = {
  url: liveUrl,
  publishedAt: new Date().toISOString(),
  ...(publishedBy ? { publishedBy } : {}),
  host: 'cloudflare-pages',
  projectName: effectiveProjectName,
}

await mkdir(dirname(PUBLISHED_PATH), { recursive: true })
await writeFile(PUBLISHED_PATH, JSON.stringify(published, null, 2) + '\n')

console.log(`\n✓ Live: ${liveUrl}`)
console.log(`  Recorded in .easel/published.json — commit when ready.`)

// --- helpers ----------------------------------------------------------------

function runCmd(cmd, args, opts) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts })
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))))
    p.on('error', rej)
  })
}

function runCmdCapture(cmd, args, opts) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    p.stdout.on('data', (d) => { const s = d.toString(); process.stdout.write(s); out += s })
    p.stderr.on('data', (d) => { const s = d.toString(); process.stderr.write(s); out += s })
    p.on('exit', (code) => (code === 0 ? res(out) : rej(new Error(`${cmd} exited ${code}: ${out}`))))
    p.on('error', rej)
  })
}

function runCmdSyncCapture(cmd, args, opts) {
  const r = spawnSync(cmd, args, { ...opts, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`${cmd} exited ${r.status}: ${r.stderr || r.stdout}`)
  return r.stdout
}

async function withRetry(fn, { tries = 2, delayMs = 2500, label = 'op' } = {}) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const msg = String(err.message ?? err)
      // Only retry transient CF API errors. Don't retry semantic errors like name collisions.
      const isTransient =
        msg.includes('500') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('Internal Server Error') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT')
      if (!isTransient || i === tries - 1) throw err
      console.log(`  ⚠ ${label} hit a transient error, retrying in ${Math.round(delayMs / 1000)}s…`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw lastErr
}

function sanitize(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function getGitUser() {
  try {
    const r = spawnSync('git', ['config', 'user.email'], { encoding: 'utf8', cwd: ROOT })
    if (r.status === 0) return r.stdout.trim() || undefined
  } catch {}
  return undefined
}
