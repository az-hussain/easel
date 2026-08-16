#!/usr/bin/env node
/**
 * Edit a deck's manifest metadata (everything except the slides array).
 *
 * Usage:
 *   npm run edit:deck -- <name> [--title "..."] [--description "..."]
 *                              [--author "..."] [--unset description|author]
 */
import { ROOT, die, arg, positionals, loadManifest, saveManifest } from './_util.mjs'

const [deckName] = positionals()
if (!deckName) die('Usage: edit:deck <name> [--title ...] [--description ...] [--author ...] [--unset field]')

const { path, raw } = await loadManifest(deckName)
const changes = []

const title = arg('--title')
if (title !== undefined) { raw.title = title; changes.push(`title="${title}"`) }

const description = arg('--description')
if (description !== undefined) { raw.description = description; changes.push(`description="${description}"`) }

const author = arg('--author')
if (author !== undefined) { raw.author = author; changes.push(`author="${author}"`) }

// --unset can appear multiple times
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--unset') continue
  const field = args[i + 1]
  if (!['description', 'author', 'createdAt'].includes(field)) {
    die(`--unset only supports: description, author, createdAt (got "${field}")`)
  }
  delete raw[field]
  changes.push(`unset ${field}`)
}

if (changes.length === 0) {
  console.log('(no changes specified)')
  console.log(`Current: title="${raw.title}"${raw.description ? ` description="${raw.description}"` : ''}${raw.author ? ` author="${raw.author}"` : ''}`)
  process.exit(0)
}

await saveManifest(path, raw)
console.log(`✓ ${path.replace(ROOT + '/', '')} updated: ${changes.join(', ')}`)
