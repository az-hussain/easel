import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { allDecks } from '@/lib/decks'
import { sharedSlides, getSlide } from '@/lib/slides'
import { buildTree } from '@/lib/tree'
import { SlideThumb } from '@/components/SlideThumb'
import { LiveBadge } from '@/components/LiveBadge'

export function Overview() {
  const decks = allDecks
  const slides = sharedSlides()
  const tree = useMemo(() => buildTree(slides, 'slides/'), [slides])
  const folderCount = countFolders(tree)

  return (
    <>
      <div className="toolbar">
        <div className="crumbs">
          <span className="leaf" style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text)' }}>
            Overview
          </span>
        </div>
        <div className="spacer" />
        <div className="meta">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      </div>
      <div className="main-scroll">
        <div className="page">
          {/* HERO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 32, marginBottom: 56 }}>
            <div>
              <div style={{ fontSize: 'var(--t-xs)', color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                Workspace
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--t-display)',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                Your slide library,
                <br />
                <span style={{ color: 'var(--text-3)' }}>built in React.</span>
              </h1>
              <p style={{ marginTop: 20, fontSize: 'var(--t-md)', color: 'var(--text-2)', maxWidth: 540 }}>
                Slides are components. Decks reference them by path. Git is the sync layer.
                The CLI is the API — your Claude can drive it.
              </p>
            </div>
            <Stats decks={decks.length} slides={slides.length} folders={folderCount} />
          </div>

          {/* DECKS */}
          <section style={{ marginBottom: 56 }}>
            <div className="section-head">
              <h2>Decks</h2>
              <Link className="right" to="/decks" style={{ color: 'var(--text-2)' }}>
                See all →
              </Link>
            </div>
            {decks.length === 0 ? (
              <EmptyDecks />
            ) : (
              <div className="grid">
                {decks.slice(0, 6).map((d) => {
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
                          <div className="sub">
                            <span>{d.slides.length} slide{d.slides.length === 1 ? '' : 's'}</span>
                            <span className="dot">·</span>
                            <span className="mono" style={{ fontSize: 11 }}>
                              {d.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* RECENTLY ADDED SLIDES (alphabetical for now — sort by mtime is a future enhancement) */}
          <section>
            <div className="section-head">
              <h2>Slide library</h2>
              <Link className="right" to="/slides" style={{ color: 'var(--text-2)' }}>
                Browse all →
              </Link>
            </div>
            {slides.length === 0 ? (
              <EmptySlides />
            ) : (
              <div className="grid dense">
                {slides.slice(0, 8).map((s) => (
                  <div className="card" key={s.path}>
                    <div className="thumb">
                      <SlideThumb slide={s} />
                    </div>
                    <div className="meta">
                      <div className="title">{prettyName(s.name.split('/').pop()!)}</div>
                      <div className="path mono">{s.path}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function Stats({ decks, slides, folders }: { decks: number; slides: number; folders: number }) {
  return (
    <div style={{ display: 'flex', gap: 28 }}>
      <Stat label="Decks" value={decks} />
      <Stat label="Slides" value={slides} />
      <Stat label="Folders" value={folders} />
    </div>
  )
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ minWidth: 64 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-3xl)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 'var(--t-xs)',
          color: 'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  )
}

function EmptyDecks() {
  return (
    <div className="empty">
      <h3>No decks yet.</h3>
      <p>Start one from the CLI:</p>
      <code>npm run new:deck -- my-first-deck --title "My first deck"</code>
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
        Or just tell Claude: "make me a deck about X" and let it scaffold + assemble.
      </p>
    </div>
  )
}

function EmptySlides() {
  return (
    <div className="empty">
      <h3>No shared slides yet.</h3>
      <p>Slides are React components — one file each, under <code>slides/</code>.</p>
      <code>npm run new:slide -- shared/intros/title</code>
    </div>
  )
}

function countFolders(node: ReturnType<typeof buildTree>): number {
  let n = node.children.length
  for (const c of node.children) n += countFolders(c)
  return n
}
function prettyName(s: string) {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
