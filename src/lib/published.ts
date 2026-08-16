import publishedRaw from '../../.gallery/published.json'

export interface Publication {
  url: string
  publishedAt: string
  publishedBy?: string
  host?: string
  projectName?: string
  deploymentId?: string
}

const published = publishedRaw as Record<string, Publication>

export function getPublished(deckName: string): Publication | undefined {
  return published[deckName]
}

export function allPublished(): Record<string, Publication> {
  return published
}
