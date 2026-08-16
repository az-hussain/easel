import { Slide } from '@/components/Slide'

export const meta = {
  title: 'Thanks',
  tags: ['outro'],
}

export const notes = 'Closing slide. Local to this deck — not promoted to the shared library.'

export default function Thanks() {
  return (
    <Slide background="#0f1117">
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h1 style={{ fontSize: 200, margin: 0, letterSpacing: -4 }}>thanks.</h1>
        <p style={{ fontSize: 32, opacity: 0.5, marginTop: 32 }}>questions?</p>
      </div>
    </Slide>
  )
}
