import { useMemo } from 'react'
import { formatDate, formatNumber } from '../utils'
import styles from './LineChart.module.css'

export interface ChartPoint {
  x: Date
  y: number
}

interface Props {
  data: ChartPoint[]
  yLabel?: string
}

const W = 320
const H = 200
const PAD_L = 8
const PAD_R = 48
const PAD_T = 14
const PAD_B = 28

export default function LineChart({ data, yLabel = '' }: Props) {
  const chart = useMemo(() => {
    if (data.length === 0) return null

    const ys = data.map((p) => p.y)
    let minY = Math.min(...ys)
    let maxY = Math.max(...ys)
    if (minY === maxY) {
      minY -= 1
      maxY += 1
    }
    const span = maxY - minY
    minY -= span * 0.1
    maxY += span * 0.1

    const iw = W - PAD_L - PAD_R
    const ih = H - PAD_T - PAD_B
    const px = (i: number) =>
      PAD_L + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
    const py = (v: number) => PAD_T + ih - ((v - minY) / (maxY - minY)) * ih

    const pts = data.map((p, i) => ({ ...p, px: px(i), py: py(p.y) }))
    const path = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px.toFixed(1)},${p.py.toFixed(1)}`)
      .join(' ')

    const grid = Array.from({ length: 4 }, (_, i) => ({
      gv: minY + ((maxY - minY) * i) / 3,
      gy: PAD_T + ih - (i / 3) * ih
    }))

    return { pts, path, grid }
  }, [data])

  if (!chart) {
    return <div className={styles.empty}>Sin datos en el rango seleccionado</div>
  }

  const last = chart.pts[chart.pts.length - 1]
  const first = chart.pts[0]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={yLabel || 'Gráfico de progreso'}>
        {chart.grid.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              y1={g.gy}
              x2={W - PAD_R}
              y2={g.gy}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text x={W - PAD_R + 6} y={g.gy + 3} className={styles.axis} textAnchor="start">
              {formatNumber(g.gv)}
            </text>
          </g>
        ))}
        <path d={chart.path} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {chart.pts.map((p, i) => (
          <circle
            key={i}
            cx={p.px}
            cy={p.py}
            r={3.2}
            fill="var(--bg)"
            stroke="var(--accent)"
            strokeWidth="2"
          />
        ))}
        <text x={PAD_L} y={H - 6} className={styles.axis}>
          {formatDate(first.x.toISOString())}
        </text>
        <text x={W - PAD_R} y={H - 6} className={styles.axis} textAnchor="end">
          {formatDate(last.x.toISOString())}
        </text>
        <text
          x={Math.min(90, Math.max(W - 90, 40))}
          y={last.py - 10}
          className={styles.lastVal}
          textAnchor="middle"
        >
          {formatNumber(last.y)}
        </text>
      </svg>
      {yLabel && <div className={styles.caption}>{yLabel}</div>}
    </div>
  )
}