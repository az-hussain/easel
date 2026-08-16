import { Link, useParams } from 'react-router-dom'
import { getDeck } from '@/lib/decks'

export function DeckEdit() {
  const { name = '' } = useParams()
  const deck = getDeck(name)

  if (!deck) {
    return (
      <>
        <div className="toolbar">
          <div className="crumbs">
            <Link to="/decks">decks</Link>
            <span className="sep">/</span>
            <span className="leaf">{name}</span>
            <span className="sep">/</span>
            <span className="leaf">edit</span>
          </div>
        </div>
        <div className="main-scroll">
          <div className="page">
            <div className="empty">
              <h3>Deck not found</h3>
              <Link to="/decks" className="btn ghost">← all decks</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="toolbar">
        <div className="crumbs">
          <Link to="/decks">decks</Link>
          <span className="sep">/</span>
          <Link to={`/decks/${deck.name}`}>{deck.name}</Link>
          <span className="sep">/</span>
          <span className="leaf">edit</span>
        </div>
        <div className="spacer" />
        <Link to={`/decks/${deck.name}`} className="btn ghost small">View</Link>
      </div>
      <div className="main-scroll">
        <div className="page">
          <div className="page-head">
            <h1>{deck.title}</h1>
            <p className="lede">
              Editing <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{deck.manifestPath}</code>.
              This view is read-only — change the JSON directly or use the CLI:
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>
              <span className="tag">add:slide</span>
              <span className="tag">remove:slide</span>
              <span className="tag">move:slide</span>
              <span className="tag">edit:deck</span>
            </div>
          </div>

          <div className="section-head">
            <h2>Slides</h2>
            <span className="right">{deck.slides.length} total</span>
          </div>
          <div className="edit-list">
            {deck.slides.map((path, idx) => (
              <div key={idx} className="edit-row">
                <div className="idx">{idx + 1}</div>
                <div className="path mono">{path}</div>
                <div className="row-meta" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {path.startsWith('slides/') ? 'shared' : 'local'}
                </div>
              </div>
            ))}
            {deck.slides.length === 0 && (
              <div className="empty">
                <h3>No slides in this deck yet.</h3>
                <code>npm run add:slide -- {deck.name} slides/shared/example.tsx</code>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
