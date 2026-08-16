import type { SlideRecord } from '@/lib/types'
import { useSlideModule } from '@/lib/useSlideModule'
import { Slide, SlideErrorBoundary, SlideOrientationProvider } from './Slide'

export function SlideThumb({ slide }: { slide: SlideRecord }) {
  const { mod, err } = useSlideModule(slide)

  if (err) {
    return (
      <Slide background="#3a1212">
        <div style={{ padding: 80, fontSize: 28 }}>Failed to load: {slide.path}</div>
      </Slide>
    )
  }

  if (!mod) {
    return (
      <Slide background="#15171d">
        <div style={{ padding: 80, opacity: 0.4, fontSize: 28 }}>Loading…</div>
      </Slide>
    )
  }

  const Component = mod.default
  const orientation = mod.meta?.orientation ?? 'landscape'

  return (
    <SlideErrorBoundary name={slide.path}>
      <SlideOrientationProvider orientation={orientation}>
        <Component />
      </SlideOrientationProvider>
    </SlideErrorBoundary>
  )
}
