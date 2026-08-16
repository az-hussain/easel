import { getPublished } from '@/lib/published'

export function LiveBadge({ deckName }: { deckName: string }) {
  const pub = getPublished(deckName)
  if (!pub) return null
  return (
    <a
      href={pub.url}
      target="_blank"
      rel="noreferrer"
      className="live-badge"
      title={`Published ${new Date(pub.publishedAt).toLocaleDateString()} → ${pub.url}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="dot" />
      Live
    </a>
  )
}
