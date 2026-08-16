import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getDeck } from '@/lib/decks'
import { getSlide } from '@/lib/slides'
import { SlideThumb } from '@/components/SlideThumb'

const IDLE_MS = 1800

const IS_PUBLISH = !!import.meta.env.VITE_PUBLISH_DECK

export function DeckView() {
  const { name = '' } = useParams()
  const deck = getDeck(name)
  const navigate = useNavigate()
  const [i, setI] = useState(0)
  const [idle, setIdle] = useState(false)
  const [stripOpen, setStripOpen] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const viewerRef = useRef<HTMLDivElement>(null)
  const idleTimer = useRef<number | undefined>(undefined)

  const items = useMemo(() => {
    if (!deck) return []
    return deck.slides.map((p) => ({ path: p, slide: getSlide(p) }))
  }, [deck])

  const total = items.length
  const next = useCallback(() => setI((x) => Math.min(total - 1, x + 1)), [total])
  const prev = useCallback(() => setI((x) => Math.max(0, x - 1)), [])
  const first = useCallback(() => setI(0), [])
  const last = useCallback(() => setI(Math.max(0, total - 1)), [total])

  const toggleFullscreen = useCallback(async () => {
    const el = viewerRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) await el.requestFullscreen()
      else await document.exitFullscreen()
    } catch (e) {
      console.warn('fullscreen failed', e)
    }
  }, [])

  // Track fullscreen state
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // Idle detection
  useEffect(() => {
    const wake = () => {
      setIdle(false)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS)
    }
    wake()
    window.addEventListener('mousemove', wake)
    window.addEventListener('keydown', wake)
    window.addEventListener('mousedown', wake)
    return () => {
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('keydown', wake)
      window.removeEventListener('mousedown', wake)
      window.clearTimeout(idleTimer.current)
    }
  }, [])

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'j' || k === 'l') {
        next(); e.preventDefault()
      } else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'k' || k === 'h') {
        prev(); e.preventDefault()
      } else if (k === 'Home') { first(); e.preventDefault() }
      else if (k === 'End') { last(); e.preventDefault() }
      else if (k === 'f' || k === 'F') { toggleFullscreen(); e.preventDefault() }
      else if (k === 's' || k === 'S') { setStripOpen((v) => !v); e.preventDefault() }
      else if (k === 'Escape') {
        if (document.fullscreenElement) document.exitFullscreen()
        else if (!IS_PUBLISH) navigate('/decks')
      } else if (/^[0-9]$/.test(k)) {
        const idx = k === '0' ? 9 : Number(k) - 1
        if (idx < total) setI(idx)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, first, last, toggleFullscreen, navigate, total])

  if (!deck) {
    return (
      <div className="viewer" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ padding: 40 }}>
          <h2>Deck not found</h2>
          <p>No deck named <code className="mono">{name}</code>.</p>
          <Link to="/decks" className="btn ghost">← all decks</Link>
        </div>
      </div>
    )
  }

  const current = items[i]
  const progress = total > 0 ? ((i + 1) / total) * 100 : 0

  return (
    <div
      ref={viewerRef}
      className={'viewer' + (idle ? ' idle' : '')}
      style={{ cursor: idle ? 'none' : 'default' }}
    >
      {/* TOP CHROME */}
      <div className="viewer-chrome">
        {!IS_PUBLISH && (
          <Link
            to="/decks"
            className="btn ghost small"
            title="Back to decks (Esc)"
            style={{ height: 28 }}
          >
            ←
          </Link>
        )}
        <div>
          <div className="title">{deck.title}</div>
          <div className="subtitle">
            {deck.author ? `${deck.author} · ` : ''}
            {deck.name}
          </div>
        </div>
        <div className="actions">
          <button
            className={'btn ghost small' + (stripOpen ? ' is-on' : '')}
            onClick={() => setStripOpen((v) => !v)}
            title="Toggle slide strip"
          >
            Slides <span className="kbd">S</span>
          </button>
          {!IS_PUBLISH && (
            <Link to={`/decks/${deck.name}/edit`} className="btn ghost small">
              Edit
            </Link>
          )}
          <button
            className="btn ghost small"
            onClick={toggleFullscreen}
            title={isFs ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
          >
            {isFs ? 'Exit' : 'Fullscreen'} <span className="kbd">F</span>
          </button>
        </div>
      </div>

      {/* STAGE — crossfade between slides */}
      <div className="viewer-stage" style={{ position: 'relative' }}>
        {items.map((it, idx) => (
          <div
            key={idx}
            className={'slide-fade' + (idx === i ? ' show' : '')}
            style={{ pointerEvents: idx === i ? 'auto' : 'none' }}
            aria-hidden={idx !== i}
          >
            {it.slide ? (
              <SlideThumb slide={it.slide} />
            ) : (
              <div
                style={{
                  color: 'var(--danger)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  padding: 24,
                  border: '1px solid var(--danger)',
                  borderRadius: 8,
                }}
              >
                Missing slide: {it.path}
              </div>
            )}
          </div>
        ))}
        {total === 0 && (
          <div style={{ color: 'var(--text-3)' }}>This deck has no slides.</div>
        )}
        {!idle && total > 1 && (
          <>
            <ClickZone side="left" onClick={prev} disabled={i === 0} />
            <ClickZone side="right" onClick={next} disabled={i >= total - 1} />
          </>
        )}
      </div>

      {/* BOTTOM CHROME */}
      <div className="viewer-foot">
        <div className="row">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              className="btn ghost small"
              onClick={prev}
              disabled={i === 0}
              title="Previous (←)"
              style={{ opacity: i === 0 ? 0.3 : 1 }}
            >
              ←
            </button>
            <button
              className="btn ghost small"
              onClick={next}
              disabled={i >= total - 1}
              title="Next (→ or Space)"
              style={{ opacity: i >= total - 1 ? 0.3 : 1 }}
            >
              →
            </button>
            <span className="counter" style={{ marginLeft: 12 }}>
              {total === 0 ? '0 / 0' : `${i + 1} / ${total}`}
            </span>
          </div>
          <div
            style={{
              fontSize: 'var(--t-xs)',
              color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)',
              maxWidth: '40%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={current?.path}
          >
            {current?.path ?? ''}
          </div>
        </div>
        <div className="progress">
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* SLIDE STRIP (toggle with S) */}
      <div className={'viewer-strip ' + (stripOpen ? '' : 'hidden')}>
        {items.map((it, idx) => (
          <div
            key={idx}
            className={'strip-thumb ' + (idx === i ? 'active' : '')}
            onClick={() => setI(idx)}
            title={`${idx + 1}. ${it.path}`}
          >
            {it.slide ? (
              <SlideThumb slide={it.slide} />
            ) : (
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>missing</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ClickZone({
  side,
  onClick,
  disabled,
}: {
  side: 'left' | 'right'
  onClick: () => void
  disabled: boolean
}) {
  if (disabled) return null
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 80,
        bottom: 80,
        [side]: 0,
        width: '18%',
        cursor: `${side === 'left' ? 'w' : 'e'}-resize`,
        zIndex: 1,
      }}
      aria-label={side === 'left' ? 'Previous slide' : 'Next slide'}
    />
  )
}
