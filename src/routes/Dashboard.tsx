import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../state/useStore'
import {
  DAY_NAMES,
  cmpPoint,
  exercisePoint,
  formatDateLong,
  formatNumber,
  formatWeight,
  isSameDay,
  logDoneSets,
  logVolume,
  previousExercisePoint,
  todayExercises,
  todayIndexOfWeek
} from '../utils'
import type { WorkoutLog } from '../types'
import styles from './Dashboard.module.css'

interface SummaryRow {
  name: string
  totalReps: number
  tonnage: number
  prevReps: number | null
  prevTonnage: number | null
}

function buildSummary(log: WorkoutLog, allLogs: WorkoutLog[]): SummaryRow[] {
  const names = [...new Set(log.completedExercises.map((e) => e.exerciseName))]
  return names
    .map((name) => {
      const point = exercisePoint(log, name) ?? { totalReps: 0, tonnage: 0 }
      const prev = previousExercisePoint(allLogs, name, log)
      return {
        name,
        totalReps: point.totalReps,
        tonnage: point.tonnage,
        prevReps: prev?.totalReps ?? null,
        prevTonnage: prev?.tonnage ?? null
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

function CmpVal({ now, prev }: { now: number; prev: number | null }) {
  if (prev === null) return <span className={styles.cmpNone}>—</span>
  const st = cmpPoint(now, prev)
  const label = st === 'equal' ? formatNumber(now) : `${formatNumber(prev)} → ${formatNumber(now)}`
  const glyph = st === 'better' ? '▲' : st === 'worse' ? '▼' : '='
  return (
    <span className={styles.cmpVal} style={{ color: `var(--${st === 'better' ? 'ok' : st === 'worse' ? 'danger' : 'warn'})` }}>
      <span className={styles.cmpGlyph}>{glyph}</span> {label}
    </span>
  )
}

export default function Dashboard() {
  const { state } = useStore()
  const navigate = useNavigate()
  const routine = state.routines.find((r) => r.active) ?? null
  const exercises = todayExercises(routine)
  const todayLog = state.logs.find((l) => isSameDay(l.date))
  const todayLogs = state.logs.filter((l) => isSameDay(l.date))
  const summaryLog = todayLogs[todayLogs.length - 1] ?? null
  const lastLog = state.logs[state.logs.length - 1]
  const totalSets = exercises.reduce((a, e) => a + e.targetSets, 0)
  const summaryRows = summaryLog ? buildSummary(summaryLog, state.logs) : []
  const totReps = summaryRows.reduce((a, r) => a + r.totalReps, 0)
  const totTon = summaryRows.reduce((a, r) => a + r.tonnage, 0)

  return (
    <>
      <header className="head">
        <div>
          <div className="kicker">{DAY_NAMES[todayIndexOfWeek()]}</div>
          <h1>Hoy</h1>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          {routine ? (
            <section className={styles.card}>
              <div className={styles.routineMeta}>
                <div className="kicker">Rutina activa</div>
                <h2 className={styles.routineName}>{routine.name}</h2>
                <p className={styles.routineDays}>
                  {routine.schedule.map((d) => DAY_NAMES[d.dayOfWeek]).join(' · ')}
                </p>
              </div>

              {exercises.length > 0 ? (
                <>
                  <div className={styles.todayBlock}>
                    <p className={styles.todayLine}>
                      <strong className="text-num">{exercises.length}</strong> ejercicios ·{' '}
                      <strong className="text-num">{totalSets}</strong> series
                    </p>
                    <button
                      type="button"
                      className="btn btn-accent btn-block"
                      onClick={() => navigate('/sesion')}
                    >
                      {todayLog ? 'Reanudar / ver plan de hoy' : 'Iniciar entrenamiento'}
                    </button>
                    {todayLog && <p className={styles.doneToday}>Ya registraste tu sesión de hoy</p>}
                  </div>

                  <div className={styles.planBlock}>
                    <div className={styles.planHead}>
                      <span className="kicker">Plan de hoy</span>
                    </div>
                    <div className={styles.planList}>
                      {exercises.map((ex, i) => (
                        <div key={ex.id} className={styles.planRow}>
                          <span className={styles.planIndex}>{i + 1}</span>
                          <span className={styles.planName}>{ex.name}</span>
                          <span className={`${styles.planGoal} text-num`}>
                            {ex.targetSets} × {ex.targetReps} @{' '}
                            {ex.bodyweight
                              ? 'Peso corporal'
                              : `${formatWeight(ex.targetWeight)} kg`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty">
                  Hoy no toca entrenar con la rutina activa. Podés usar el plan de otro día en{' '}
                  <Link to="/sesion">Sesión</Link>.
                </div>
              )}
            </section>
          ) : (
            <div className="empty">
              No hay una rutina activa. Creá o activá una en <Link to="/rutinas">Rutinas</Link>.
            </div>
          )}

          {summaryLog && (
            <section className={styles.card}>
              <div className={styles.sumHead}>
                <span className="kicker">Resumen de hoy</span>
              </div>
              <div className={styles.sumList}>
                {summaryRows.map((r) => (
                  <div key={r.name} className={styles.sumRow}>
                    <div className={styles.sumName}>{r.name}</div>
                    <div className={styles.sumMain}>
                      <span className={styles.sumReps}>
                        <strong className="text-num">{formatNumber(r.totalReps)}</strong> reps
                      </span>
                      <span className={`${styles.sumTon} text-num`}>
                        {formatNumber(r.tonnage)} kg
                      </span>
                    </div>
                    <div className={styles.sumCmp}>
                      <CmpVal now={r.totalReps} prev={r.prevReps} />
                      <CmpVal now={r.tonnage} prev={r.prevTonnage} />
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.sumTotal}>
                <span className={styles.sumName}>Total</span>
                <span className={styles.sumReps}>
                  <strong className="text-num">{formatNumber(totReps)}</strong> reps
                </span>
                <span className={`${styles.sumTon} text-num`}>{formatNumber(totTon)} kg</span>
                <span className={styles.sumTotalCmp} />
              </div>

              <div className={styles.sumLegend}>
                <span className={styles.ok}>▲</span> mejor{' '}
                <span className={styles.warn}>=</span> igual{' '}
                <span className={styles.danger}>▼</span> peor — vs sesión anterior
              </div>
            </section>
          )}
        </div>

        <aside className={styles.aside}>
          <section className={styles.lastBlock}>
            <div className={styles.lastHead}>
              <span className="kicker">Última sesión</span>
            </div>
            {lastLog ? (
              <div className={styles.lastRow}>
                <div>
                  <p className={styles.lastDate}>{formatDateLong(lastLog.date)}</p>
                  <p className={styles.lastMeta}>
                    {lastLog.completedExercises.length} ejercicios · {logDoneSets(lastLog)} series
                    completadas
                  </p>
                </div>
                <div className={styles.lastVolume}>
                  <span className="kicker">Volumen</span>
                  <span className={`${styles.lastVolumeVal} text-num`}>
                    {formatNumber(logVolume(lastLog))}
                  </span>
                </div>
              </div>
            ) : (
              <p className={styles.lastMeta}>Todavía no registraste sesiones.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}