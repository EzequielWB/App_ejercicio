import { Link } from 'react-router-dom'
import { useStore } from '../state/useStore'
import { DAY_NAMES } from '../utils'
import styles from './Rutinas.module.css'

const IconTrash = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
)

export default function Rutinas() {
  const { state, dispatch } = useStore()

  return (
    <>
      <header className="head">
        <div>
          <div className="kicker">
            {state.routines.length} rutina{state.routines.length === 1 ? '' : 's'}
          </div>
          <h1>Rutinas</h1>
        </div>
      </header>

      {state.routines.length === 0 ? (
        <div className="empty">No hay rutinas todavía. Creá la primera.</div>
      ) : (
        <div className={styles.list}>
          <div className={styles.listHead}>
            <span>Nombre</span>
            <span>Días</span>
            <span>Ejercicios</span>
            <span>Acciones</span>
          </div>
          {state.routines.map((r) => {
            const count = r.schedule.reduce((a, d) => a + d.exercises.length, 0)
            return (
              <div key={r.id} className={styles.row}>
                <Link to={`/rutinas/${r.id}`} className={styles.rowName}>
                  {r.name}
                </Link>
                <span className={styles.rowDays}>
                  {r.schedule.map((d) => DAY_NAMES[d.dayOfWeek]).join(' · ') || '—'}
                </span>
                <span className={`${styles.rowCount} text-num`}>
                  {count > 0 ? count : '—'}
                </span>
                <div className={styles.actions}>
                  {r.active ? (
                    <span className={styles.badge}>Activa</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => dispatch({ type: 'setActive', id: r.id })}
                    >
                      Activar
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    aria-label={`Eliminar ${r.name}`}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar la rutina "${r.name}"?`)) {
                        dispatch({ type: 'deleteRoutine', id: r.id })
                      }
                    }}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className={styles.footer}>
        <Link to="/biblioteca" className="btn btn-block">
          Biblioteca de ejercicios
        </Link>
        <Link to="/rutinas/nueva" className="btn btn-accent btn-block">
          + Nueva rutina
        </Link>
      </div>
    </>
  )
}