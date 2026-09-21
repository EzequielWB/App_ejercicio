import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LineChart from '../components/LineChart'
import type { ChartPoint } from '../components/LineChart'
import { useStore } from '../state/useStore'
import type { WorkoutLog } from '../types'
import { DAY_NAMES_SHORT, e1rm, formatDate, formatNumber, logVolume } from '../utils'
import styles from './Progreso.module.css'

type Metric = 'max' | 'vol' | 'e1rm'
type Range = 30 | 90

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function buildSeries(
  logs: WorkoutLog[],
  exerciseName: string,
  metric: Metric,
  range: Range
): ChartPoint[] {
  const cutoff = Date.now() - range * 86400000
  const byDay = new Map<string, number[]>()

  for (const log of logs) {
    const t = new Date(log.date).getTime()
    if (t < cutoff) continue
    const ex = log.completedExercises.find((e) => e.exerciseName === exerciseName)
    if (!ex) continue
    const completed = ex.sets.filter((s) => s.completed)
    if (completed.length === 0) continue
    const val =
      metric === 'max'
        ? Math.max(...completed.map((s) => s.weightUsed))
        : metric === 'e1rm'
          ? Math.max(...completed.map((s) => e1rm(s.weightUsed, s.repsPerformed)))
          : completed.reduce((a, s) => a + s.repsPerformed * s.weightUsed, 0)
    const key = new Date(log.date).toDateString()
    const arr = byDay.get(key) ?? []
    arr.push(val)
    byDay.set(key, arr)
  }

  return Array.from(byDay.entries())
    .map(([key, vals]) => ({
      x: new Date(key),
      y: metric === 'vol' ? vals.reduce((a, b) => a + b, 0) : Math.max(...vals)
    }))
    .sort((a, b) => a.x.getTime() - b.x.getTime())
}

function MonthCalendar({ logs }: { logs: WorkoutLog[] }) {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })

  const volByDay = new Map<number, number>()
  const daySet = new Set<number>()
  let monthTotal = 0
  for (const l of logs) {
    const d = new Date(l.date)
    if (d.getFullYear() !== ym.y || d.getMonth() !== ym.m) continue
    const v = logVolume(l)
    volByDay.set(d.getDate(), (volByDay.get(d.getDate()) ?? 0) + v)
    daySet.add(d.getDate())
    monthTotal += v
  }
  const maxVol = Math.max(0, ...volByDay.values())

  const offset = new Date(ym.y, ym.m, 1).getDay()
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const heat = (vol: number): number => {
    if (vol === 0 || maxVol === 0) return 0
    const r = vol / maxVol
    return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1
  }

  const shift = (delta: number) => {
    const total = ym.y * 12 + ym.m + delta
    setYm({ y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 })
  }

  return (
    <section className={styles.calCard}>
      <div className={styles.calHead}>
        <button type="button" className="btn btn-sm" onClick={() => shift(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <span className={styles.calTitle}>
          {MONTHS[ym.m]} {ym.y}
        </span>
        <button type="button" className="btn btn-sm" onClick={() => shift(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      <div className={styles.calGrid}>
        {DAY_NAMES_SHORT.map((d) => (
          <span key={d} className={styles.calDow}>
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`x${i}`} className={styles.calCell} />
          const vol = volByDay.get(day) ?? 0
          const lvl = heat(vol)
          const isToday =
            day === now.getDate() && ym.m === now.getMonth() && ym.y === now.getFullYear()
          return (
            <span
              key={day}
              title={vol > 0 ? `${day} · ${formatNumber(vol)} kg` : undefined}
              className={`${styles.calCell} ${lvl > 0 ? styles[`calLvl${lvl}` as keyof typeof styles] : ''} ${
                isToday ? styles.calToday : ''
              }`}
            >
              {day}
              {vol > 0 && <span className={styles.calVol}>{formatNumber(vol)}</span>}
            </span>
          )
        })}
      </div>

      <p className={styles.calFooter}>
        {daySet.size === 0
          ? 'Sin sesiones este mes'
          : `${daySet.size} día${daySet.size === 1 ? '' : 's'} entrenado${daySet.size === 1 ? '' : 's'} · ${formatNumber(monthTotal)} kg de volumen`}
      </p>
    </section>
  )
}

export default function Progreso() {
  const { state } = useStore()

  const exercises = useMemo(() => {
    const names = new Set<string>()
    state.logs.forEach((l) => l.completedExercises.forEach((e) => names.add(e.exerciseName)))
    state.routines.forEach((r) =>
      r.schedule.forEach((d) => d.exercises.forEach((e) => names.add(e.name)))
    )
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'))
  }, [state.logs, state.routines])

  const [exercise, setExercise] = useState('')
  const [metric, setMetric] = useState<Metric>('max')
  const [range, setRange] = useState<Range>(30)

  useEffect(() => {
    if (!exercise && exercises.length > 0) setExercise(exercises[0])
  }, [exercises, exercise])

  const points = useMemo(
    () => buildSeries(state.logs, exercise, metric, range),
    [state.logs, exercise, metric, range]
  )

  const first = points[0]
  const last = points[points.length - 1]
  const delta = first && last ? last.y - first.y : 0
  const sessions = points.length

  const yLabel = metric === 'max' ? 'Peso máximo (kg)' : metric === 'e1rm' ? '1RM estimado (kg)' : 'Volumen (series × reps × kg)'

  return (
    <>
      <header className="head">
        <div>
          <div className="kicker">Seguimiento</div>
          <h1>Progreso</h1>
        </div>
        <Link to="/historial" className="btn btn-sm">
          Historial ({state.logs.length})
        </Link>
      </header>

      {exercises.length === 0 ? (
        <div className="empty">Sin datos todavía. Completá una sesión para ver tu progreso.</div>
      ) : (
        <>
          <MonthCalendar logs={state.logs} />

          <section className={styles.filters}>
            <div className={styles.fRow}>
              <div className={`${styles.fCell} ${styles.fExercise}`}>
                <label className="label" htmlFor="exercise-select">
                  Ejercicio
                </label>
                <select
                  id="exercise-select"
                  className="select"
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                >
                  {exercises.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fSegs}>
                <div className={styles.fCell}>
                  <span className="label">Métrica</span>
                  <div className="seg">
                    <button
                      type="button"
                      className={metric === 'max' ? 'on' : ''}
                      onClick={() => setMetric('max')}
                    >
                      Peso máx
                    </button>
                    <button
                      type="button"
                      className={metric === 'vol' ? 'on' : ''}
                      onClick={() => setMetric('vol')}
                    >
                      Volumen
                    </button>
                    <button
                      type="button"
                      className={metric === 'e1rm' ? 'on' : ''}
                      onClick={() => setMetric('e1rm')}
                    >
                      1RM est
                    </button>
                  </div>
                </div>

                <div className={styles.fCell}>
                  <span className="label">Rango</span>
                  <div className="seg">
                    <button
                      type="button"
                      className={range === 30 ? 'on' : ''}
                      onClick={() => setRange(30)}
                    >
                      30 d
                    </button>
                    <button
                      type="button"
                      className={range === 90 ? 'on' : ''}
                      onClick={() => setRange(90)}
                    >
                      90 d
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.chartCard}>
            <h2 className={styles.exerciseTitle}>{exercise}</h2>
            <LineChart data={points} yLabel={yLabel} />
          </section>

          {first && last && (
            <section className={styles.stats}>
              <div className={styles.stat}>
                <span className="kicker">Sesiones</span>
                <span className={`${styles.statVal} text-num`}>{sessions}</span>
              </div>
              <div className={styles.stat}>
                <span className="kicker">Inicio</span>
                <span className={`${styles.statVal} text-num`}>{formatNumber(first.y)}</span>
                <span className={styles.statSub}>{formatDate(first.x.toISOString())}</span>
              </div>
              <div className={styles.stat}>
                <span className="kicker">Último</span>
                <span className={`${styles.statVal} text-num`}>{formatNumber(last.y)}</span>
                <span className={styles.statSub}>{formatDate(last.x.toISOString())}</span>
              </div>
              <div className={styles.stat}>
                <span className="kicker">Δ</span>
                <span
                  className={`${styles.statVal} text-num ${delta >= 0 ? styles.pos : styles.neg}`}
                >
                  {delta >= 0 ? '+' : ''}
                  {formatNumber(delta)}
                </span>
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}