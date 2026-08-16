import type { SlideModule, SlideRecord } from './types'

const sharedModules = import.meta.glob<SlideModule>('/slides/**/*.tsx')
const deckLocalModules = import.meta.glob<SlideModule>('/decks/*/slides/*.tsx')

function recordFromShared(path: string, loader: () => Promise<SlideModule>): SlideRecord {
  const rel = path.replace(/^\/slides\//, '').replace(/\.tsx$/, '')
  return { path: path.replace(/^\//, ''), scope: 'shared', name: rel, load: loader }
}

function recordFromDeck(path: string, loader: () => Promise<SlideModule>): SlideRecord {
  const m = path.match(/^\/decks\/([^/]+)\/slides\/(.+)\.tsx$/)
  if (!m) throw new Error(`Bad deck slide path: ${path}`)
  return { path: path.replace(/^\//, ''), scope: m[1], name: m[2], load: loader }
}

export const allSlides: SlideRecord[] = [
  ...Object.entries(sharedModules).map(([p, l]) => recordFromShared(p, l)),
  ...Object.entries(deckLocalModules).map(([p, l]) => recordFromDeck(p, l)),
]

const byPath = new Map(allSlides.map((s) => [s.path, s]))

export function sharedSlides(): SlideRecord[] {
  return allSlides.filter((s) => s.scope === 'shared')
}

export function deckLocalSlides(deckName: string): SlideRecord[] {
  return allSlides.filter((s) => s.scope === deckName)
}

export function getSlide(path: string): SlideRecord | undefined {
  return byPath.get(path)
}
