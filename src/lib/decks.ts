import type { Deck } from './types'

interface RawDeck {
  title: string
  description?: string
  author?: string
  createdAt?: string
  slides: string[]
}

const manifests = import.meta.glob<{ default: RawDeck }>('/decks/*/deck.json', { eager: true })

export const allDecks: Deck[] = Object.entries(manifests).map(([path, mod]) => {
  const m = path.match(/^\/decks\/([^/]+)\/deck\.json$/)
  if (!m) throw new Error(`Bad deck path: ${path}`)
  const raw = mod.default
  return {
    name: m[1],
    manifestPath: path.replace(/^\//, ''),
    title: raw.title,
    description: raw.description,
    author: raw.author,
    createdAt: raw.createdAt,
    slides: raw.slides,
  }
})

const byName = new Map(allDecks.map((d) => [d.name, d]))

export function getDeck(name: string): Deck | undefined {
  return byName.get(name)
}
