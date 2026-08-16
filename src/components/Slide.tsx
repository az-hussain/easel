import {
  Component,
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { Orientation } from '@/lib/types'

/** Landscape is the canonical slide size (16:9). */
export const SLIDE_W = 1920
export const SLIDE_H = 1080

/**
 * Per-orientation sizing.
 *
 * - `canvas` is the authoring/preview coordinate space (what you design in).
 * - `page` is the size of the printed PDF page, in CSS px (96px = 1in).
 *
 * Landscape authors at 1920×1080 and prints 1:1. Portrait is **US Letter**
 * (8.5×11): authored at 1632×2112 — Letter at 192dpi, so the font/padding
 * scale stays close to landscape — and scaled ×0.5 onto a true 816×1056px
 * (8.5×11in) page, which Chromium emits as a standard 612×792pt Letter page.
 */
const SPECS: Record<Orientation, { canvas: { w: number; h: number }; page: { w: number; h: number } }> = {
  landscape: { canvas: { w: SLIDE_W, h: SLIDE_H }, page: { w: SLIDE_W, h: SLIDE_H } },
  portrait: { canvas: { w: 1632, h: 2112 }, page: { w: 816, h: 1056 } },
}

/** Authoring/preview dimensions for an orientation. */
export function slideDims(orientation: Orientation): { w: number; h: number } {
  return SPECS[orientation].canvas
}

const PrintModeContext = createContext(false)

/**
 * Orientation flows from a slide's `meta.orientation` down to its <Slide>
 * wrapper via this context. The renderers (SlideThumb, PrintView) set it; a
 * slide can still override per-instance with the `orientation` prop.
 */
const OrientationContext = createContext<Orientation>('landscape')

export function PrintModeProvider({ children }: { children: ReactNode }) {
  return <PrintModeContext.Provider value={true}>{children}</PrintModeContext.Provider>
}

export function SlideOrientationProvider({
  orientation,
  children,
}: {
  orientation: Orientation
  children: ReactNode
}) {
  return <OrientationContext.Provider value={orientation}>{children}</OrientationContext.Provider>
}

interface Props {
  children: ReactNode
  background?: string
  /** Fit to parent (default). Ignored when rendered inside <PrintModeProvider>. */
  fit?: boolean
  /**
   * Override the canvas orientation. Normally left unset — orientation is
   * driven by the slide's `meta.orientation` through context.
   */
  orientation?: Orientation
}

export function Slide({ children, background = '#0b0d12', fit = true, orientation }: Props) {
  const isPrint = useContext(PrintModeContext)
  const ctxOrientation = useContext(OrientationContext)
  const effectiveOrientation = orientation ?? ctxOrientation
  const { w: SW, h: SH } = slideDims(effectiveOrientation)
  const effectiveFit = isPrint ? false : fit
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    if (!effectiveFit) return
    const el = containerRef.current
    if (!el) return
    const parent = el.parentElement
    if (!parent) return

    const compute = () => {
      const { width, height } = parent.getBoundingClientRect()
      const s = Math.min(width / SW, height / SH)
      setScale(Number.isFinite(s) && s > 0 ? s : 1)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [effectiveFit, SW, SH])

  const inner = (
    <div
      className="slide-canvas"
      data-orientation={effectiveOrientation}
      style={{
        width: SW,
        height: SH,
        background,
        position: 'relative',
        overflow: 'hidden',
        color: '#e6e8ee',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif',
      }}
    >
      {children}
    </div>
  )

  if (!effectiveFit) {
    // Print: render the canvas at its authoring size, scaled to land exactly
    // on the PDF page box (1:1 for landscape, ×0.5 for portrait/Letter).
    const { canvas, page } = SPECS[effectiveOrientation]
    if (page.w === canvas.w && page.h === canvas.h) return inner
    // Scale with `zoom`, NOT a CSS transform. zoom changes the element's actual
    // layout box (1632×2112 → 816×1056), so Chromium's print pipeline fragments
    // it onto one page cleanly. A transform is visual-only: tall transformed
    // content gets mis-clipped to a fraction of the page on export.
    const z = page.w / canvas.w
    return <div style={{ zoom: z } as CSSProperties}>{inner}</div>
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: SW * scale,
        height: SH * scale,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: SW,
          height: SH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {inner}
      </div>
    </div>
  )
}

/** Boundary so one bad slide doesn't kill the deck. */
export function SlideErrorBoundary({ children, name }: { children: ReactNode; name: string }) {
  return <ErrorWrap name={name}>{children}</ErrorWrap>
}

class ErrorWrap extends Component<{ children: ReactNode; name: string }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error) { console.error('Slide error:', this.props.name, err) }
  render() {
    if (this.state.err) {
      return (
        <Slide background="#3a1212">
          <div style={{ padding: 80 }}>
            <h1 style={{ fontSize: 64, marginBottom: 24 }}>Slide error</h1>
            <p style={{ fontSize: 28, opacity: 0.8 }}>{this.props.name}</p>
            <pre style={{ marginTop: 32, fontSize: 22, whiteSpace: 'pre-wrap' }}>
              {String(this.state.err.message)}
            </pre>
          </div>
        </Slide>
      )
    }
    return this.props.children
  }
}
