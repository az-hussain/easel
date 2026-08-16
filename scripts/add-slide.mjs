#!/usr/bin/env node
/**
 * Add a slide path to a deck's manifest.
 *
 * Usage:
 *   npm run add:slide -- <deck> <slide-path> [--at <position>]
 *
 * <slide-path> is from project root, e.g.:
 *   slides/shared/examples/title.tsx
 *   decks/my-deck/slides/local-thing.tsx
 *
 * <position> is 1-based (matches the viewer's "3 / 8" numbering).
 * Without --at, appends to the end.
 */
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ROOT, die, arg, positionals, loadManifest, saveManifest, resolveSlideIndex } from './_util.mjs'

const [deckName, slidePath] = positionals()
if (!deckName || !slidePath) die('Usage: add:slide <deck> <slide-path> [--at <pos>]')

try { await access(resolve(ROOT, slidePath)) } catch { die(`slide file not found: ${slidePath}`) }
if (!/^(slides\/.+\.tsx|decks\/[^/]+\/slides\/.+\.tsx)$/.test(slidePath)) {
  die(`slide path must be like slides/...tsx or decks/<name>/slides/...tsx`)
}

const { path, raw } = await loadManifest(deckName)
const at = arg('--at')

if (raw.slides.includes(slidePath)) {
  console.log(`(already in deck) ${slidePath}`)
} else if (at !== undefined) {
  const idx = resolveSlideIndex(raw.slides.concat(['__sentinel__']), at) // allow position len+1
  if (idx === null) die(`--at ${at} is out of range (1..${raw.slides.length + 1})`)
  raw.slides.splice(idx, 0, slidePath)
} else {
  raw.slides.push(slidePath)
}

await saveManifest(path, raw)
console.log(`✓ ${path.replace(ROOT + '/', '')} now has ${raw.slides.length} slide(s)`)
