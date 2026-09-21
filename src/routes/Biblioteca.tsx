import { useState } from 'react'
import { useStore } from '../state/useStore'
import { formatDate, formatNumber, normalize } from '../utils'
import styles from './Biblioteca.module.css'

export default function Biblioteca() {
  const { state, dispatch } = useStore()
  const [query, setQuery] = useState('')

  const key = normalize(query)
  const entries = state.library
    .filter((l) => (key ? normalize(l.name).includes(key) : true))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return (
    <>
      <header className="head">
        <div>
          <div className="kicker">
            {state.library.length} ejercicio{state.library.length === 1 ? '' : 's'}
          </div>
          <h1>Biblioteca</h1>
        </div>
        <div className={styles.headNote}>
          Se llena sola con cada sesión que registrás. Acá podés ver los récords de cada ejercicio.
        </div>
      </header>

      <input
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar ejercicio…"
        autoComplete="off"
      />

      {entries.length === 0 ? (
        <div className="empty">
          {query
            ? 'Sin coincidencias.'
            : 'Todavía no hay ejercicios. Registrá una sesión o agregá ejercicios desde el editor de rutina.'}
        </div>
      ) : (
        <div className={styles.list}>
          {entries.map((l) => (
            <div key={l.id} className={styles.row}>
              <div className={styles.rowHead}>
                <span className={styles.title}>{l.name}</span>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      if (window.confirm(`¿Reiniciar los récords de "${l.name}"?`)) {
                        dispatch({ type: 'resetLibraryValues', id: l.id })
                      }
                    }}
                  >
                    Reiniciar récords
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${l.name}" de la biblioteca?`)) {
                        dispatch({ type: 'deleteLibraryExercise', id: l.id })
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className={styles.values}>
                <div className={styles.value}>
                  <span className="kicker">Peso máx</span>
                  <span className={`${styles.valueNum} text-num`}>
                    {l.maxWeight > 0 ? `${formatNumber(l.maxWeight)} kg` : '—'}
                  </span>
                </div>
                <div className={styles.value}>
                  <span className="kicker">1RM est</span>
                  <span className={`${styles.valueNum} text-num`}>
                    {l.maxE1RM > 0 ? `${formatNumber(l.maxE1RM)} kg` : '—'}
                  </span>
                </div>
                <div className={styles.value}>
                  <span className="kicker">Reps máx</span>
                  <span className={`${styles.valueNum} text-num`}>
                    {l.maxReps > 0 ? formatNumber(l.maxReps) : '—'}
                  </span>
                </div>
              </div>
              <p className={styles.meta}>
                {l.times > 0 ? `${l.times} sesión${l.times === 1 ? '' : 'es'}` : 'sin entrenamientos registrados'}
                {l.lastDate ? ` · último ${formatDate(l.lastDate)}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}