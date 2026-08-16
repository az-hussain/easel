#!/usr/bin/env node
/**
 * Scaffold a new slide .tsx file from a template.
 *
 * Usage:
 *   npm run new:slide -- <rel-path>             # shared slide → slides/<rel-path>.tsx
 *   npm run new:slide -- --deck <name> <path>   # deck-local → decks/<name>/slides/<path>.tsx
 *   [--title "Title"] [--portrait] [--force]
 *
 * The <path> should NOT include the .tsx extension. Subdirectories allowed.
 * Pass --portrait to scaffold a 1080×1920 portrait slide.
 */
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, resolve, basename } from 'node:path'
import { ROOT, die, arg, positionals, toPascal } from './_util.mjs'

const deck = arg('--deck')
const title = arg('--title')
const force = process.argv.includes('--force')
const portrait = process.argv.includes('--portrait')
const [relPath] = positionals()

if (!relPath) die('missing <path>. Example: shared/intro/title  OR  --deck foo my-slide')

const sanitized = relPath.replace(/\.tsx$/, '')
const targetPath = deck
  ? resolve(ROOT, 'decks', deck, 'slides', `${sanitized}.tsx`)
  : resolve(ROOT, 'slides', `${sanitized}.tsx`)

if (deck) {
  try {
    await access(resolve(ROOT, 'decks', deck, 'deck.json'))
  } catch {
    die(`deck "${deck}" not found (decks/${deck}/deck.json missing). Run new:deck first.`)
  }
}

let exists = false
try { await access(targetPath); exists = true } catch {}
if (exists && !force) die(`${targetPath} already exists. Pass --force to overwrite.`)

const componentName = toPascal(basename(sanitized)) || 'Slide'
const slideTitle = title ?? basename(sanitized).replace(/[-_]/g, ' ')

const body = `import { Slide } from '@/components/Slide'

export const meta = {
  title: ${JSON.stringify(slideTitle)},
  tags: [],${portrait ? `\n  orientation: 'portrait',` : ''}
}

export const notes = ''

export default function ${componentName}() {
  return (
    <Slide>
      <div style={{ padding: 120 }}>
        <h1 style={{ fontSize: 96, margin: 0, lineHeight: 1.05 }}>
          ${escapeJsx(slideTitle)}
        </h1>
        <p style={{ fontSize: 32, opacity: 0.7, marginTop: 24 }}>
          Edit this file to build your slide.
        </p>
      </div>
    </Slide>
  )
}
`

await mkdir(dirname(targetPath), { recursive: true })
await writeFile(targetPath, body)

const projectRel = targetPath.replace(ROOT + '/', '')
console.log(`✓ created ${projectRel}`)
console.log(`  reference in a deck as: "${projectRel}"`)

function escapeJsx(s) {
  return String(s).replace(/[<>{}]/g, (c) => `{${JSON.stringify(c)}}`)
}
