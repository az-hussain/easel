import { useEffect, useState } from 'react'
import type { SlideModule, SlideRecord } from './types'

/**
 * Load a slide's module (component + meta) into state. Unlike React.lazy this
 * surfaces `meta` to the caller, so renderers can read `meta.orientation`
 * before deciding how to size the slide. Still code-split — `load()` is a
 * dynamic import.
 */
export function useSlideModule(slide: SlideRecord): {
  mod: SlideModule | null
  err: Error | null
} {
  const [mod, setMod] = useState<SlideModule | null>(null)
  const [err, setErr] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setMod(null)
    setErr(null)
    slide
      .load()
      .then((m) => {
        if (!cancelled) setMod(m)
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      cancelled = true
    }
  }, [slide.path])

  return { mod, err }
}
