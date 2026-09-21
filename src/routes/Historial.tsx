import { Link } from 'react-router-dom'
import { useStore } from '../state/useStore'
import { formatDateLong, formatNumber, logDoneSets, logVolume } from '../utils'
import styles from './Historial.module.css'

export default function Historial() {
  const { state } = useStore()

  const logs = [...state.logs].sort((a, b) => b.date.localeCompare(a.date))
  const routineName = (id: string) => state.routines.find((r) => r.id === id)?.name ?? 'Sesión'

  return (
    <>
      <header className="head">
        <div>
          <div className="kicker">
            {logs.length} sesión{logs.length === 1 ? '' : 'es'} registradas
          </div>
          <h1>Historial</h1>
        </div>
      </header>

      {logs.length === 0 ? (
        <div className="empty">Todavía no registraste ninguna sesión.</div>
      ) : (
        <div className={styles.list}>
          {logs.map((l) => (
            <Link key={l.id} to={`/historial/${l.id}`} className={styles.row}>
              <div className={styles.rowHead}>
                <span className={styles.date}>{formatDateLong(l.date)}</span>
                <span className={`${styles.toggle} text-num`}>›</span>
              </div>
              <p className={styles.meta}>
                {routineName(l.routineId)} · {l.completedExercises.length} ejercicio
                {l.completedExercises.length === 1 ? '' : 's'} ·{' '}
                {logDoneSets(l)} series
              </p>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className="kicker">Reps totales</span>
                  <span className={`${styles.statVal} text-num`}>
                    {formatNumber(
                      l.completedExercises.reduce(
                        (a, e) => a + e.sets.filter((s) => s.completed).reduce((x, s) => x + s.repsPerformed, 0),
                        0
                      )
                    )}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className="kicker">Volumen</span>
                  <span className={`${styles.statVal} text-num`}>{formatNumber(logVolume(l))}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <Link to="/sesion" className="btn btn-accent btn-block">
          + Registrar sesión
        </Link>
      </div>
    </>
  )
}