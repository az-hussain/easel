#!/usr/bin/env node
/**
 * Reorder a slide within a deck's manifest.
 *
 * Usage:
 *   npm run move:slide -- <deck> <from> <to>
 *
 * Both <from> and <to> are 1-based positions. <from> may also be a slide path.
 * <to> may be "start", "end", or a 1-based index. If <to> exceeds slide count,
 * the slide moves to the end.
 */
import { ROOT, die, positionals, loadManifest, saveManifest, resolveSlideIndex } from './_util.mjs'

const [deckName, fromRef, toRef] = positionals()
if (!deckName || !fromRef || !toRef) die('Usage: move:slide <deck> <from> <to>')

const { path, raw } = await loadManifest(deckName)
if (raw.slides.length === 0) die(`deck "${deckName}" has no slides`)

const fromIdx = resolveSlideIndex(raw.slides, fromRef)
if (fromIdx === null) die(`from ref "${fromRef}" not found`)

let toIdx
if (toRef === 'start') toIdx = 0
else if (toRef === 'end') toIdx = raw.slides.length - 1
else if (/^\d+$/.test(toRef)) {
  toIdx = Math.min(raw.slides.length - 1, Math.max(0, Number(toRef) - 1))
} else {
  die(`<to> must be a 1-based position, "start", or "end"`)
}

if (fromIdx === toIdx) {
  console.log(`(no change) slide already at position ${toIdx + 1}`)
  process.exit(0)
}

const [moved] = raw.slides.splice(fromIdx, 1)
raw.slides.splice(toIdx, 0, moved)

await saveManifest(path, raw)
console.log(`✓ moved ${fromIdx + 1} → ${toIdx + 1}: ${moved}`)
