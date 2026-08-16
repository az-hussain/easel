import { readFile, writeFile, access } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function manifestPath(deckName) {
  return resolve(ROOT, 'decks', deckName, 'deck.json')
}

export async function loadManifest(deckName) {
  const p = manifestPath(deckName)
  try { await access(p) } catch { die(`deck "${deckName}" not found (${p.replace(ROOT + '/', '')} missing)`) }
  const raw = JSON.parse(await readFile(p, 'utf8'))
  raw.slides ??= []
  return { path: p, raw }
}

export async function saveManifest(p, raw) {
  await writeFile(p, JSON.stringify(raw, null, 2) + '\n')
}

/**
 * Resolve a slide ref to a 0-based index into the slides array.
 * Accepts a 1-based number string ("3") OR a full path ("slides/...").
 * Returns null if not found.
 */
export function resolveSlideIndex(slides, ref) {
  if (/^\d+$/.test(ref)) {
    const oneBased = Number(ref)
    if (oneBased < 1 || oneBased > slides.length) return null
    return oneBased - 1
  }
  const idx = slides.indexOf(ref)
  return idx >= 0 ? idx : null
}

export function die(msg) {
  console.error(`error: ${msg}`)
  process.exit(1)
}

export function arg(name, args = process.argv.slice(2)) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : undefined
}

export function positionals(args = process.argv.slice(2)) {
  const out = []
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { i++; continue }
    out.push(args[i])
  }
  return out
}

/** Convert a kebab-or-slash path into a PascalCase component name. */
export function toPascal(name) {
  return name
    .split(/[/_-]/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('')
}
