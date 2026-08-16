#!/usr/bin/env node
/**
 * Remove a slide from a deck's manifest.
 *
 * Usage:
 *   npm run remove:slide -- <deck> <position-or-path>
 *
 * The slide ref can be:
 *   - a 1-based position ("3")  — removes the slide at that spot
 *   - a slide path              — removes the first matching path
 *
 * Does NOT delete the underlying .tsx file. (Shared slides may be used by
 * other decks; deck-local slides can be deleted manually with rm.)
 */
import { ROOT, die, positionals, loadManifest, saveManifest, resolveSlideIndex } from './_util.mjs'

const [deckName, ref] = positionals()
if (!deckName || !ref) die('Usage: remove:slide <deck> <position-or-path>')

const { path, raw } = await loadManifest(deckName)
if (raw.slides.length === 0) die(`deck "${deckName}" has no slides`)

const idx = resolveSlideIndex(raw.slides, ref)
if (idx === null) die(`slide ref "${ref}" not found in deck (got ${raw.slides.length} slide(s))`)

const [removed] = raw.slides.splice(idx, 1)
await saveManifest(path, raw)
console.log(`✓ removed (was #${idx + 1}): ${removed}`)
console.log(`  ${path.replace(ROOT + '/', '')} now has ${raw.slides.length} slide(s)`)
