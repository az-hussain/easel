import { Slide } from '@/components/Slide'

export const meta = {
  title: 'Title slide',
  tags: ['intro', 'cover'],
}

export const notes = 'Open the deck with this. Replace headline + subtitle per use.'

export default function Title() {
  return (
    <Slide background="linear-gradient(135deg, #0a0b0f 0%, #1a1d2e 60%, #2c2247 100%)">
      <div style={{ padding: 160, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 24, letterSpacing: 6, opacity: 0.5, textTransform: 'uppercase' }}>
          Gallery
        </div>
        <h1 style={{ fontSize: 128, margin: '24px 0 0', lineHeight: 1.02, fontWeight: 600 }}>
          A deck built<br />from code.
        </h1>
        <p style={{ fontSize: 36, opacity: 0.6, marginTop: 48, maxWidth: 1100 }}>
          React components, one per slide. Git-tracked. PDF-exportable.
        </p>
      </div>
    </Slide>
  )
}
