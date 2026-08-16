import type { ComponentType } from 'react'

/** Slide canvas orientation. Landscape (1920×1080) is the default. */
export type Orientation = 'landscape' | 'portrait'

export interface SlideMeta {
  title?: string
  tags?: string[]
  caption?: string
  /** Flip the canvas to portrait (1080×1920). Defaults to landscape. */
  orientation?: Orientation
}

export interface SlideModule {
  default: ComponentType
  meta?: SlideMeta
  notes?: string
}

export interface SlideRecord {
  /** Path from project root, e.g. "slides/shared/intro/title.tsx" */
  path: string
  /** "shared" or "<deck-name>" (for deck-local) */
  scope: 'shared' | string
  /** Relative within scope, e.g. "intro/title" (no extension) */
  name: string
  load: () => Promise<SlideModule>
}

export interface Deck {
  name: string
  manifestPath: string
  title: string
  description?: string
  author?: string
  createdAt?: string
  slides: string[]
}
