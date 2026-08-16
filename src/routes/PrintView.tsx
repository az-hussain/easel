import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getDeck } from '@/lib/decks'
import { getSlide } from '@/lib/slides'
import { PrintModeProvider, Slide, SlideErrorBoundary, SlideOrientationProvider } from '@/components/Slide'
import type { SlideModule } from '@/lib/types'

type Loaded = { path: string; mod: SlideModule | null }

/**
 * Renders every slide in a deck at its native size (1920×1080 landscape or
 * 1080×1920 portrait) stacked vertically with a page break between them. Used
 * by Playwright PDF export, but also navigable directly via /print/<name>.
 *
 * Each slide's `meta.orientation` drives both the canvas size and the
 * `data-orientation` on its `.print-page`, which maps to a named CSS @page so
 * the PDF page is sized per slide. Modules are loaded eagerly (not via lazy)
 * so orientation is known before paint.
 *
 * Sets window.__SLIDES_READY = true once every slide module has settled, so
 * Playwright knows when to print.
 */
export function PrintView() {
  const { name = '' } = useParams()
  const deck = getDeck(name)
  const [loaded, setLoaded] = useState<Loaded[] | null>(null)

  const paths = useMemo(() => deck?.slides ?? [], [deck])

  useEffect(() => {
    if (!deck) return
    let cancelled = false
    Promise.all(
      paths.map(async (path) => {
        const rec = getSlide(path)
        if (!rec) return { path, mod: null }
        try {
          return { path, mod: await rec.load() }
        } catch (e) {
          console.error('print: load failed', path, e)
          return { path, mod: null }
        }
      }),
    )
      .then((items) => {
        if (cancelled) return
        setLoaded(items)
        return document.fonts?.ready ?? Promise.resolve()
      })
      .then(() => {
        if (cancelled) return
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            ;(window as unknown as { __SLIDES_READY: boolean }).__SLIDES_READY = true
          }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [deck, paths])

  if (!deck) return <div style={{ padding: 40 }}>Deck not found: {name}</div>

  return (
    <PrintModeProvider>
      <div className="print-root" style={{ background: 'white' }}>
        {(loaded ?? paths.map((path) => ({ path, mod: null }))).map((it, i) => {
          const orientation = it.mod?.meta?.orientation ?? 'landscape'
          const Component = it.mod?.default
          return (
            <div className="print-page" data-orientation={orientation} key={i}>
              <SlideErrorBoundary name={it.path}>
                {Component ? (
                  <SlideOrientationProvider orientation={orientation}>
                    <Component />
                  </SlideOrientationProvider>
                ) : loaded ? (
                  <Slide background="#3a1212">
                    <div style={{ padding: 80, fontSize: 32 }}>Missing slide: {it.path}</div>
                  </Slide>
                ) : (
                  <Slide>
                    <div style={{ padding: 80, opacity: 0.4 }}>Loading…</div>
                  </Slide>
                )}
              </SlideErrorBoundary>
            </div>
          )
        })}
      </div>
    </PrintModeProvider>
  )
}
