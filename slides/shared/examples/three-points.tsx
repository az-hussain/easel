import { Slide } from '@/components/Slide'

export const meta = {
  title: 'Three points',
  tags: ['layout', 'list'],
}

const POINTS = [
  { kicker: '01', title: 'Write a slide', body: 'A single React component. Use any HTML, SVG, or library you want.' },
  { kicker: '02', title: 'Reference it', body: 'Add its path to a deck.json — shared or deck-local.' },
  { kicker: '03', title: 'Export', body: 'npm run export packages the deck into a 1920×1080 PDF.' },
]

export default function ThreePoints() {
  return (
    <Slide>
      <div style={{ padding: '120px 140px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 64, margin: 0 }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48, marginTop: 80, flex: 1 }}>
          {POINTS.map((p) => (
            <div key={p.kicker} style={{ borderTop: '2px solid #7c83ff', paddingTop: 32 }}>
              <div style={{ fontSize: 22, color: '#7c83ff', letterSpacing: 2 }}>{p.kicker}</div>
              <h3 style={{ fontSize: 42, margin: '20px 0 16px' }}>{p.title}</h3>
              <p style={{ fontSize: 24, opacity: 0.7, lineHeight: 1.45 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  )
}
