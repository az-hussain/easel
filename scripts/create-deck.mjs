#!/usr/bin/env node
/**
 * Scaffold a new empty deck.
 *
 * Usage:
 *   npm run new:deck -- <name> [--title "Deck Title"] [--description "..."] [--author "..."]
 */
import { mkdir, writeFile, access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ROOT, die, arg, positionals } from './_util.mjs'

const [name] = positionals()
if (!name) die('missing <name>. Example: q3-review')
if (!/^[a-z0-9-]+$/.test(name)) die('deck name must be lowercase kebab-case')

const title = arg('--title') ?? name
const description = arg('--description')
const author = arg('--author')

const deckDir = resolve(ROOT, 'decks', name)
const manifestPath = resolve(deckDir, 'deck.json')

let exists = false
try { await access(manifestPath); exists = true } catch {}
if (exists) die(`deck "${name}" already exists`)

const manifest = {
  $schema: '../../schemas/deck.schema.json',
  title,
  ...(description ? { description } : {}),
  ...(author ? { author } : {}),
  createdAt: new Date().toISOString().slice(0, 10),
  slides: [],
}

await mkdir(resolve(deckDir, 'slides'), { recursive: true })
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

console.log(`✓ created decks/${name}/deck.json`)
console.log(`  add slides with: npm run add:slide -- ${name} <slide-path>`)
