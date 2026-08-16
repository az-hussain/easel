import { Slide } from '@/components/Slide'

export const meta = {
  title: 'Chart example',
  tags: ['data', 'chart'],
}

const DATA = [
  { label: 'Q1', value: 32 },
  { label: 'Q2', value: 48 },
  { label: 'Q3', value: 61 },
  { label: 'Q4', value: 79 },
]

export default function Chart() {
  const max = Math.max(...DATA.map((d) => d.value))
  const W = 1400
  const H = 600
  const barW = W / DATA.length - 60

  return (
    <Slide>
      <div style={{ padding: 120 }}>
        <h2 style={{ fontSize: 56, margin: 0 }}>Quarterly growth</h2>
        <p style={{ fontSize: 28, opacity: 0.55, margin: '12px 0 40px' }}>
          Synthetic numbers. SVG drawn directly — no chart lib needed.
        </p>
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          {DATA.map((d, i) => {
            const h = (d.value / max) * (H - 80)
            const x = i * (W / DATA.length) + 30
            const y = H - h - 40
            return (
              <g key={d.label}>
                <rect x={x} y={y} width={barW} height={h} fill="#7c83ff" rx={8} />
                <text x={x + barW / 2} y={y - 16} fill="#e6e8ee" fontSize={28} textAnchor="middle">
                  {d.value}
                </text>
                <text x={x + barW / 2} y={H - 8} fill="#9aa0ad" fontSize={24} textAnchor="middle">
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </Slide>
  )
}
