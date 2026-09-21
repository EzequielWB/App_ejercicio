import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../state/useStore'
import { formatDateLong, formatNumber, formatWeight } from '../utils'
import styles from './Historial.module.css'

export default function HistorialDetalle() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const { id } = useParams()
  const log = state.logs.find((l) => l.id === id)

  if (!log) {
    return (
      <>
        <header className="head">
          <div>
            <div className="kicker">Historial</div>
            <h1>Sesión no encontrada</h1>
          </div>
        </header>
        <div className="empty">
          Ese registro no existe. <Link to="/historial">Volver al historial</Link>.
        </div>
      </>
    )
  }

  const routineName = state.routines.find((r) => r.id === log.routineId)?.name ?? 'Sesión'
  const doneSets = log.completedExercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.completed).length,
    0
  )
  const totalReps = log.completedExercises.reduce(
    (a, e) =>
      a + e.sets.filter((s) => s.completed).reduce((x, s) => x + s.repsPerformed, 0),
    0
  )
  const tonnage = log.completedExercises.reduce(
    (a, e) =>
      a + e.sets.filter((s) => s.completed).reduce((x, s) => x + s.repsPerformed * s.weightUsed, 0),
    0
  )

  return (
    <>
      <header className="head">
        <div>
          <div className="kicker">{routineName}</div>
          <h1>{formatDateLong(log.date)}</h1>
        </div>
      </header>

      <div className={styles.detailStats}>
        <div className={styles.detailStat}>
          <span className="kicker">Series</span>
          <span className={`${styles.detailStatVal} text-num`}>{doneSets}</span>
        </div>
        <div className={styles.detailStat}>
          <span className="kicker">Reps totales</span>
          <span className={`${styles.detailStatVal} text-num`}>{formatNumber(totalReps)}</span>
        </div>
        <div className={styles.detailStat}>
          <span className="kicker">Tonelaje</span>
          <span className={`${styles.detailStatVal} text-num`}>{formatNumber(tonnage)} kg</span>
        </div>
      </div>

      <div className={styles.detailList}>
        {log.completedExercises.map((ex) => (
          <div key={ex.exerciseName} className={styles.detailEx}>
            <h2 className={styles.detailExName}>{ex.exerciseName}</h2>
            <div className={styles.setList}>
              {ex.sets.map((s, i) => (
                <div
                  key={i}
                  className={`${styles.setRow} ${s.completed ? styles.setDone : ''}`}
                >
                  <span className={styles.setIndex}>
                    {s.completed ? '✓' : '·'} S{i + 1}
                  </span>
                  <span className={`text-num ${styles.setVal}`}>{formatWeight(s.repsPerformed)}</span>
                  <span className={`text-num ${styles.setVal}`}>
                    {formatWeight(s.weightUsed)} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.detailActions}>
        <Link to="/historial" className="btn btn-block">
          Volver al historial
        </Link>
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={() => {
            if (window.confirm('¿Eliminar esta sesión?')) {
              dispatch({ type: 'deleteLog', id: log.id })
              navigate('/historial')
            }
          }}
        >
          Eliminar sesión
        </button>
      </div>
    </>
  )
}