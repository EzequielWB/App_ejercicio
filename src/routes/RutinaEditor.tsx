import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import NumberField from '../components/NumberField'
import Stepper from '../components/Stepper'
import ExerciseNameField from '../components/ExerciseNameField'
import { useStore } from '../state/useStore'
import { uid } from '../storage/db'
import type { ExerciseTemplate, Routine } from '../types'
import { DAY_NAMES, DAY_NAMES_SHORT, formatWeight } from '../utils'
import styles from './RutinaEditor.module.css'

type Mode = 'same' | 'perDay'

interface DraftExercise {
  key: string
  name: string
  targetSets: number
  targetReps: string
  targetWeight: number
  bodyweight: boolean
  restSec: number | null
}

const IconX = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

const IconUp = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 14l6-6 6 6" />
  </svg>
)

const IconDown = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 10l6 6 6-6" />
  </svg>
)

const cloneList = (list: DraftExercise[]): DraftExercise[] =>
  list.map((e) => ({ ...e, key: uid() }))

const toDraft = (e: ExerciseTemplate): DraftExercise => ({
  key: e.id,
  name: e.name,
  targetSets: e.targetSets,
  targetReps: e.targetReps,
  targetWeight: e.targetWeight,
  bodyweight: e.bodyweight ?? false,
  restSec: e.restSec ?? null
})

export default function RutinaEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()

  const isNew = !id || id === 'nueva'
  const existing = isNew ? null : state.routines.find((r) => r.id === id) ?? null

  const blank = () => ({
    key: uid(),
    name: '',
    targetSets: 3,
    targetReps: '10',
    targetWeight: 0,
    bodyweight: false,
    restSec: null
  })

  const [name, setName] = useState(() => existing?.name ?? '')
  const [active, setActive] = useState(() => existing?.active ?? false)
  const [days, setDays] = useState<number[]>(() => existing?.schedule.map((d) => d.dayOfWeek) ?? [])
  const [mode, setMode] = useState<Mode>(() => {
    if (!existing) return 'same'
    const eq = existing.schedule.map((d) => JSON.stringify(d.exercises))
    return eq.length > 0 && eq.every((x) => x === eq[0]) ? 'same' : 'perDay'
  })
  const [shared, setShared] = useState<DraftExercise[]>(() =>
    (existing?.schedule[0]?.exercises ?? []).map(toDraft)
  )
  const [dayPlans, setDayPlans] = useState<Record<number, DraftExercise[]>>(() => {
    const rec: Record<number, DraftExercise[]> = {}
    for (const d of existing?.schedule ?? []) {
      rec[d.dayOfWeek] = d.exercises.map(toDraft)
    }
    return rec
  })
  const [editingDay, setEditingDay] = useState<number>(
    () => existing?.schedule[0]?.dayOfWeek ?? 0
  )
  const [copyFrom, setCopyFrom] = useState<number>(
    () => (existing?.schedule[0]?.dayOfWeek ?? 0)
  )

  const editingDaySafe =
    mode === 'perDay' && days.includes(editingDay) ? editingDay : (days[0] ?? editingDay)

  const activeExercises = mode === 'same' ? shared : (dayPlans[editingDaySafe] ?? [])

  const setActiveExercises = (updater: (prev: DraftExercise[]) => DraftExercise[]) => {
    if (mode === 'same') {
      setShared(updater)
    } else {
      setDayPlans((prev) => ({ ...prev, [editingDaySafe]: updater(prev[editingDaySafe] ?? []) }))
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    if (m === 'perDay') {
      setDayPlans((prev) => {
        let changed = false
        const next = { ...prev }
        for (const d of days) {
          if (next[d] === undefined) {
            next[d] = cloneList(shared)
            changed = true
          }
        }
        return changed ? next : prev
      })
      setEditingDay((prev) => (days.includes(prev) ? prev : (days[0] ?? prev)))
    }
  }

  const toggleDay = (d: number) => {
    const on = days.includes(d)
    if (on) {
      setDays(days.filter((x) => x !== d))
      if (mode === 'perDay' && d === editingDay) {
        setEditingDay(days.find((x) => x !== d) ?? 0)
      }
    } else {
      setDays([...days, d])
      if (mode === 'perDay' && dayPlans[d] === undefined) {
        setDayPlans((prev) => ({ ...prev, [d]: cloneList(shared) }))
      }
      setEditingDay(d)
    }
  }

  const patchActive = (key: string, patch: Partial<DraftExercise>) => {
    setActiveExercises((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }

  const addActive = () => {
    setActiveExercises((prev) => [...prev, blank()])
  }

  const removeActive = (key: string) => {
    setActiveExercises((prev) => prev.filter((x) => x.key !== key))
  }

  const moveActive = (from: number, to: number) => {
    setActiveExercises((prev) => {
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const copyOptions = days.filter((d) => d !== editingDaySafe)
  const copyFromValue = copyOptions.includes(copyFrom) ? copyFrom : (copyOptions[0] ?? 0)
  const canCopy = copyFromValue !== 0 && (dayPlans[copyFromValue]?.length ?? 0) > 0

  const copyToEditing = () => {
    if (!canCopy) return
    setActiveExercises(() => cloneList(dayPlans[copyFromValue] ?? []))
    setCopyFrom(editingDaySafe)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      window.alert('Poné un nombre para la rutina.')
      return
    }
    if (days.length === 0) {
      window.alert('Seleccioná al menos un día de la semana.')
      return
    }
    const selectedDays = [...days].sort((a, b) => a - b)

    const toTemplates = (list: DraftExercise[]): ExerciseTemplate[] =>
      list
        .filter((ex) => ex.name.trim())
        .map((ex) => ({
          id: uid(),
          name: ex.name.trim(),
          targetSets: ex.targetSets,
          targetReps: ex.targetReps.trim(),
          targetWeight: ex.targetWeight,
          bodyweight: ex.bodyweight,
          restSec: ex.restSec ?? undefined
        }))

    const routine: Routine = {
      id: existing?.id ?? uid(),
      name: name.trim(),
      active,
      schedule:
        mode === 'same'
          ? selectedDays.map((d) => ({
              dayOfWeek: d,
              exercises: toTemplates(shared).map((t) => ({ ...t, id: uid() }))
            }))
          : selectedDays.map((d) => ({
              dayOfWeek: d,
              exercises: toTemplates(dayPlans[d] ?? [])
            }))
    }
    dispatch({ type: 'upsertRoutine', routine })
    navigate('/rutinas')
  }

  return (
    <>
      <header className="head">
        <div>
          <div className="kicker">{isNew ? 'Nueva' : 'Editar'}</div>
          <h1>{isNew ? 'Crear rutina' : existing?.name ?? 'Rutina'}</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.grid}>
          <div className={styles.gridLeft}>
            <section className={styles.section}>
              <label className="label" htmlFor="rname">
                Nombre
              </label>
              <input
                id="rname"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Fuerza 5x5"
                autoComplete="off"
              />
              <label className={`${styles.check} ${styles.activeCheck}`}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span>Rutina activa</span>
              </label>
            </section>

            <section className={styles.section}>
              <span className="label">Plan semanal</span>
              <div className="seg">
                <button
                  type="button"
                  className={mode === 'same' ? 'on' : ''}
                  onClick={() => switchMode('same')}
                >
                  Todos los días igual
                </button>
                <button
                  type="button"
                  className={mode === 'perDay' ? 'on' : ''}
                  onClick={() => switchMode('perDay')}
                >
                  Cada día varía
                </button>
              </div>
            </section>

            <section className={styles.section}>
              <span className="label">Días de la semana</span>
              <div className={styles.days}>
                {DAY_NAMES_SHORT.map((d, i) => (
                  <button
                    type="button"
                    key={i}
                    className={`pill ${days.includes(i) ? 'on' : ''}`}
                    onClick={() => toggleDay(i)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </section>

            {mode === 'perDay' && (
              <section className={styles.section}>
                <span className="label">Editando día</span>
                <div className={styles.days}>
                  {days.length === 0 && <p className={styles.hint}>Marcá arriba los días de la semana.</p>}
                  {[...days].sort((a, b) => a - b).map((d) => (
                    <button
                      type="button"
                      key={d}
                      className={`pill ${editingDaySafe === d ? 'on' : ''}`}
                      onClick={() => {
                        setEditingDay(d)
                        if (copyOptions.includes(copyFrom)) setCopyFrom(copyFrom)
                      }}
                    >
                      {DAY_NAMES_SHORT[d]}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!isNew && (
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={() => {
                  if (window.confirm(`¿Eliminar la rutina "${existing?.name}"?`)) {
                    dispatch({ type: 'deleteRoutine', id: existing!.id })
                    navigate('/rutinas')
                  }
                }}
              >
                Eliminar rutina
              </button>
            )}
          </div>

          <div className={styles.gridRight}>
            <section className={styles.section}>
              <div className={styles.exHead}>
                <span className="label">
                  Ejercicios
                  {mode === 'perDay' ? ` · ${DAY_NAMES[editingDaySafe]}` : ''}
                </span>
              </div>

              {mode === 'perDay' && copyOptions.length > 0 && (
                <div className={styles.copyRow}>
                  <span className={styles.copyLabel}>Copiar desde</span>
                  <select
                    className="select"
                    value={copyFromValue}
                    onChange={(e) => setCopyFrom(Number(e.target.value))}
                  >
                    {copyOptions.map((d) => (
                      <option key={d} value={d}>
                        {DAY_NAMES[d]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={copyToEditing}
                    disabled={!canCopy}
                  >
                    Copiar
                  </button>
                </div>
              )}

              {activeExercises.length === 0 && (
                <p className={styles.hint}>
                  {mode === 'same'
                    ? 'Sin ejercicios todavía. Se aplicarán a todos los días elegidos.'
                    : 'Sin ejercicios en este día todavía. Cada día tiene su propia lista.'}
                </p>
              )}

              <div className={styles.exList}>
                {activeExercises.map((ex, i) => (
                  <div key={ex.key} className={styles.exCard}>
                    <div className={styles.exTop}>
                      <span className={styles.exIndex}>E{i + 1}</span>
                      <ExerciseNameField
                        value={ex.name}
                        onChange={(name) => patchActive(ex.key, { name })}
                        placeholder="Nombre del ejercicio"
                      />
                      <div className={styles.exMove}>
                        <button
                          type="button"
                          className={styles.exMoveBtn}
                          aria-label="Mover ejercicio hacia arriba"
                          disabled={i === 0}
                          onClick={() => moveActive(i, i - 1)}
                        >
                          <IconUp />
                        </button>
                        <button
                          type="button"
                          className={styles.exMoveBtn}
                          aria-label="Mover ejercicio hacia abajo"
                          disabled={i === activeExercises.length - 1}
                          onClick={() => moveActive(i, i + 1)}
                        >
                          <IconDown />
                        </button>
                      </div>
                      <button
                        type="button"
                        className={styles.exRemove}
                        aria-label="Quitar ejercicio"
                        onClick={() => removeActive(ex.key)}
                      >
                        <IconX />
                      </button>
                    </div>
                    <div className={styles.exTargets}>
                      <Stepper
                        label="Series"
                        value={ex.targetSets}
                        onChange={(v) => patchActive(ex.key, { targetSets: v })}
                        min={1}
                        max={20}
                      />
                      <div className={styles.repsGroup}>
                        <span className="label">Reps (rango)</span>
                        <input
                          className={styles.repsInput}
                          value={ex.targetReps}
                          onChange={(e) => patchActive(ex.key, { targetReps: e.target.value })}
                          placeholder="Ej. 8-12"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={ex.bodyweight}
                          onChange={(e) => patchActive(ex.key, { bodyweight: e.target.checked })}
                        />
                        <span>Peso corporal</span>
                      </label>
                      {!ex.bodyweight && (
                        <NumberField
                          label="Peso"
                          value={ex.targetWeight}
                          onChange={(v) => patchActive(ex.key, { targetWeight: v })}
                          min={0}
                          max={999}
                          step={2.5}
                          unit="kg"
                        />
                      )}
                    </div>
                    <p className={styles.targetText}>
                      Objetivo: {ex.targetSets} × {ex.targetReps} reps @{' '}
                      {ex.bodyweight
                        ? 'Peso corporal'
                        : `${formatWeight(ex.targetWeight)} kg`}
                      {ex.restSec ? ` · Descanso ${ex.restSec}s` : ''}
                    </p>

                    <div className={styles.restField}>
                      <span className="label">Descanso (opcional)</span>
                      {ex.restSec === null ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => patchActive(ex.key, { restSec: 60 })}
                        >
                          Agregar descanso
                        </button>
                      ) : (
                        <>
                          <div className={styles.restChips}>
                            {[30, 45, 60, 90, 120].map((s) => (
                              <button
                                key={s}
                                type="button"
                                className={`${styles.restChip} ${
                                  ex.restSec === s ? styles.restChipOn : ''
                                }`}
                                onClick={() => patchActive(ex.key, { restSec: s })}
                              >
                                {s}s
                              </button>
                            ))}
                          </div>
                          <NumberField
                            label="Descanso en segundos"
                            value={ex.restSec}
                            onChange={(v) => patchActive(ex.key, { restSec: v })}
                            min={5}
                            max={1800}
                            step={5}
                            unit="s"
                          />
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => patchActive(ex.key, { restSec: null })}
                          >
                            Sin descanso
                          </button>
                        </>
                      )}
                    </div>
</div>
                  ))}
                </div>
                <div className={styles.exAdd}>
                  <button type="button" className="btn btn-block" onClick={addActive}>
                    + Agregar ejercicio
                  </button>
                </div>
              </section>
          </div>
        </div>

        <div className={styles.formFooter}>
          <button type="button" className="btn" onClick={() => navigate('/rutinas')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-accent">
            Guardar
          </button>
        </div>
      </form>
    </>
  )
}