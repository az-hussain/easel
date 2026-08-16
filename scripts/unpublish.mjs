#!/usr/bin/env node
/**
 * Take a published deck offline.
 *
 * Usage:
 *   npm run unpublish -- <deck-name> [--yes]
 *
 * Flow:
 *   1. Look up the deck in .easel/published.json to find its CF project name.
 *   2. Confirm with the user.
 *   3. Delete the CF Pages project (kills the URL).
 *   4. Remove the entry from .easel/published.json.
 *
 * Note: deletion is irreversible from our side, but CF retains deployment
 * history in their dashboard for a short window if you really need to recover.
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PUBLISHED_PATH = resolve(ROOT, '.easel/published.json')

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log('Usage: npm run unpublish -- <deck-name> [--yes]')
  process.exit(args.length === 0 ? 1 : 0)
}

const yes = args.includes('--yes') || args.includes('-y')
const deckName = args.find((a) => !a.startsWith('--'))
if (!deckName) {
  console.error('error: missing deck name')
  process.exit(1)
}

// --- 1. Look up publication record ------------------------------------------
let published = {}
try { published = JSON.parse(await readFile(PUBLISHED_PATH, 'utf8')) } catch {}

const entry = published[deckName]
if (!entry) {
  console.error(`error: deck "${deckName}" is not in .easel/published.json — nothing to unpublish.`)
  console.error(`       (If you published from a different machine and need to take it down,`)
  console.error(`        either pull the latest published.json or run:`)
  console.error(`        npx wrangler pages project delete <project-name>)`)
  process.exit(1)
}

const projectName = entry.projectName
if (!projectName) {
  console.error('error: published.json entry is missing projectName.')
  process.exit(1)
}

console.log(`\n  Deck:        ${deckName}`)
console.log(`  URL:         ${entry.url}`)
console.log(`  Project:     ${projectName}`)
console.log(`  Published:   ${entry.publishedAt}${entry.publishedBy ? ` by ${entry.publishedBy}` : ''}`)
console.log(`\n  ⚠ This will DELETE the Cloudflare Pages project and take the URL offline.`)
console.log(`     Subsequent visitors get a 404. Anyone with the deployment history`)
console.log(`     can recover briefly via the CF dashboard — but that window is short.\n`)

if (!yes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ans = (await rl.question('Take it down? [y/N] ')).trim().toLowerCase()
  rl.close()
  if (ans !== 'y' && ans !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }
}

// --- 2. Check wrangler auth -------------------------------------------------
const whoami = spawnSync('npx', ['wrangler', 'whoami'], { cwd: ROOT, encoding: 'utf8' })
if (whoami.status !== 0) {
  console.error('error: wrangler is not authenticated. Run `npx wrangler login`.')
  process.exit(1)
}

// --- 3. Delete the project --------------------------------------------------
console.log(`▸ deleting CF Pages project "${projectName}"`)
await runCmd(
  'npx',
  ['wrangler', 'pages', 'project', 'delete', projectName, '--yes'],
  { cwd: ROOT },
)

// --- 4. Remove from published.json ------------------------------------------
delete published[deckName]
await mkdir(dirname(PUBLISHED_PATH), { recursive: true })
await writeFile(PUBLISHED_PATH, JSON.stringify(published, null, 2) + '\n')

console.log(`\n✓ Took ${entry.url} offline.`)
console.log(`  Removed from .easel/published.json — commit when ready.`)

function runCmd(cmd, args, opts) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts })
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))))
    p.on('error', rej)
  })
}
