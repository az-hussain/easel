import { Link } from 'react-router-dom'
import { allDecks } from '@/lib/decks'
import { getSlide } from '@/lib/slides'
import { SlideThumb } from '@/components/SlideThumb'
import { LiveBadge } from '@/components/LiveBadge'

export function DeckList() {
  return (
    <>
      <div className="toolbar">
        <div className="crumbs">
          <span className="leaf" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text)' }}>
            Decks
          </span>
        </div>
        <div className="spacer" />
        <div className="meta">{allDecks.length} deck{allDecks.length === 1 ? '' : 's'}</div>
      </div>
      <div className="main-scroll">
        <div className="page">
          <div className="page-head">
            <h1>Decks</h1>
            <p className="lede">
              Each deck is a JSON manifest at <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>decks/&lt;name&gt;/deck.json</code> referencing slides by path.
            </p>
          </div>

          {allDecks.length === 0 ? (
            <div className="empty">
              <h3>No decks yet.</h3>
              <p>Spin one up:</p>
              <code>npm run new:deck -- my-first-deck --title "My first deck"</code>
            </div>
          ) : (
            <div className="grid">
              {allDecks.map((d) => {
                const first = d.slides[0] ? getSlide(d.slides[0]) : undefined
                return (
                  <Link key={d.name} to={`/decks/${d.name}`} style={{ display: 'block' }}>
                    <div className="card">
                      <div className="thumb">
                        {first ? (
                          <SlideThumb slide={first} />
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>empty</span>
                        )}
                      </div>
                      <div className="meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                          <div className="title">{d.title}</div>
                          <LiveBadge deckName={d.name} />
                        </div>
                        {d.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{d.description}</div>
                        )}
                        <div className="sub" style={{ marginTop: 6 }}>
                          <span>{d.slides.length} slide{d.slides.length === 1 ? '' : 's'}</span>
                          {d.createdAt && (
                            <>
                              <span className="dot">·</span>
                              <span>{d.createdAt}</span>
                            </>
                          )}
                          <span className="dot">·</span>
                          <span className="mono" style={{ fontSize: 11 }}>{d.name}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
