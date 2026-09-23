import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NumberField from '../components/NumberField'
import Timers from '../components/Timers'
import { restStart } from '../components/restTimerApi'
import { useStore } from '../state/useStore'
import { clearSessionDraft, loadSessionDraft, saveSessionDraft, uid } from '../storage/db'
import type { SessionDraft, SessionDraftExercise } from '../storage/db'
import type { ExerciseTemplate, SetRecord, WorkoutLog } from '../types'
import { DAY_NAMES, DAY_NAMES_SHORT, formatWeight, todayIndexOfWeek } from '../utils'
import styles from './Sesion.module.css'

const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 12l5 5 9-10" />
  </svg>
)

const IconChevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M7 10l5 5 5-5" />
  </svg>
)

function initDrafts(exercises: ExerciseTemplate[], profileWeight: number): SessionDraftExercise[] {
  return exercises.map((e) => ({
    id: e.id,
    name: e.name,
    sets: Array.from({ length: e.targetSets }, () => ({
      repsPerformed: 0,
      weightUsed: e.bodyweight && profileWeight > 0 ? profileWeight : e.targetWeight,
      completed: false
    }))
  }))
}

export default function Sesion() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const routine = state.routines.find((r) => r.active) ?? null

  const savedRef = useRef<SessionDraft | null | undefined>(undefined)
  const getSaved = (): SessionDraft | null => {
    if (savedRef.current === undefined) savedRef.current = loadSessionDraft()
    return savedRef.current
  }

  const [overrideDay, setOverrideDay] = useState<number | null>(() => {
    const s = getSaved()
    return s && s.routineId === routine?.id ? s.planDay : null
  })
  const planDay = overrideDay ?? todayIndexOfWeek()
  const exercises = routine
    ? (routine.schedule.find((d) => d.dayOfWeek === planDay)?.exercises ?? [])
    : []
  const signature = exercises.map((e) => `${e.name}|${e.targetSets}|${e.targetReps}`).join('~')

  const saved = getSaved()
  const restored =
    saved !== null &&
    saved.routineId === routine?.id &&
    saved.planDay === planDay &&
    saved.signature === signature

  const [drafts, setDrafts] = useState<SessionDraftExercise[]>(() =>
    restored ? saved?.drafts ?? [] : initDrafts(exercises, state.profile.weightKg)
  )
  const [expanded, setExpanded] = useState<string[]>(() =>
    restored ? saved?.expanded ?? [] : []
  )

  const [logDate, setLogDate] = useState(() => {
    if (restored && saved?.logDate) return saved.logDate
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })

  const skippedFirst = useRef(false)
  useEffect(() => {
    if (!skippedFirst.current) {
      skippedFirst.current = true
      return
    }
    setDrafts(initDrafts(exercises, state.profile.weightKg))
    setExpanded([])
  }, [planDay, routine?.id])

  useEffect(() => {
    if (!routine || exercises.length === 0) return
    const draft: SessionDraft = {
      routineId: routine.id,
      planDay,
      logDate,
      expanded,
      signature,
      drafts
    }
    saveSessionDraft(draft)
  }, [drafts, planDay, logDate, expanded, signature, routine?.id, exercises.length])

  const totalSets = drafts.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = drafts.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0)
  const pct = totalSets === 0 ? 0 : Math.round((doneSets / totalSets) * 100)

  const patchSet = (exIndex: number, setIndex: number, patch: Partial<SetRecord>) => {
    setDrafts((prev) =>
      prev.map((e, i) =>
        i === exIndex
          ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) }
          : e
      )
    )
  }

  const completeSet = (
    exIndex: number,
    setIndex: number,
    template: ExerciseTemplate,
    completed: boolean
  ) => {
    patchSet(exIndex, setIndex, { completed })
    if (completed && template.restSec) restStart(template.restSec)
  }

  const handleFinish = () => {
    if (!routine) return
    const anyDone = drafts.some((e) => e.sets.some((s) => s.completed))
    if (
      !anyDone &&
      !window.confirm('No marcaste ninguna serie completada. ¿Guardar de todas formas?')
    ) {
      return
    }
    const [y, m, d] = logDate.split('-').map(Number)
    const log: WorkoutLog = {
      id: uid(),
      routineId: routine.id,
      date: new Date(y, m - 1, d, 12, 0, 0).toISOString(),
      completedExercises: drafts.map((e) => ({
        exerciseName: e.name,
        sets: e.sets
      }))
    }
    dispatch({ type: 'addWorkoutLog', log })
    clearSessionDraft()
    navigate('/')
  }

  const sessionHead = (
    <header className="head">
      <div>
        <div className="kicker">Modo sesión</div>
        <h1>Sesión</h1>
      </div>
    </header>
  )

  if (!routine) {
    return (
      <>
        {sessionHead}
        <div className="empty">
          No hay una rutina activa. Activá una en <Link to="/rutinas">Rutinas</Link>.
        </div>
      </>
    )
  }

  if (exercises.length === 0) {
    const planned = routine.schedule
    return (
      <>
        {sessionHead}
        <div className="empty">
          {planned.length === 0
            ? `${routine.name} no tiene ejercicios todavía. Editá la rutina en Rutinas.`
            : `${routine.name} no tiene plan para hoy (${DAY_NAMES[todayIndexOfWeek()]}). Sus días son: ${planned
                .map((d) => DAY_NAMES[d.dayOfWeek])
                .join(' · ')}.`}
        </div>
        {planned.length > 0 && (
          <div className={styles.dayChoose}>
            <span className="label">Entrenar plan de</span>
            <div className="seg">
              {planned.map((d) => (
                <button
                  key={d.dayOfWeek}
                  type="button"
                  onClick={() => setOverrideDay(d.dayOfWeek)}
                >
                  {DAY_NAMES_SHORT[d.dayOfWeek]}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className={styles.dayHint}>
          También podés revisar <Link to="/rutinas">tus rutinas</Link>.
        </p>
      </>
    )
  }

  return (
    <>
      <header className="head">
        <div>
          <div className="kicker">
            {DAY_NAMES[planDay]} · {routine.name}
          </div>
          <h1>Sesión en curso</h1>
        </div>
      </header>

      <div className={styles.session}>
        <main className={styles.main}>
          <div className={styles.progressBlock}>
            <div className={styles.progressText}>
              <span>
                <strong className="text-num">{doneSets}</strong>/{totalSets} series
              </span>
              <span className="text-num">{pct}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className={styles.exList}>
            {drafts.map((ex, exIndex) => {
              const open = expanded.includes(ex.id)
              const exDone = ex.sets.filter((s) => s.completed).length
              const template = exercises[exIndex]
              return (
                <section key={ex.id} className={styles.ex}>
                  <button
                    type="button"
                    className={styles.exHead}
                    onClick={() =>
                      setExpanded((prev) =>
                        prev.includes(ex.id)
                          ? prev.filter((id) => id !== ex.id)
                          : [...prev, ex.id]
                      )
                    }
                    aria-expanded={open}
                  >
                    <div>
                      <h2 className={styles.exName}>{ex.name}</h2>
                      <p className={styles.exMeta}>
                        {exDone}/{ex.sets.length} series completadas
                      </p>
                    </div>
                    <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
                      <IconChevron />
                    </span>
                  </button>

                  <div className={`${styles.sets} ${open ? styles.setsOpen : ''}`}>
                    {ex.sets.map((set, setIndex) => (
                      <div
                        key={setIndex}
                        className={`${styles.setRow} ${set.completed ? styles.setDone : ''}`}
                      >
                        <button
                          type="button"
                          className={`${styles.check} ${set.completed ? styles.checkOn : ''}`}
                          onClick={() => completeSet(exIndex, setIndex, template, !set.completed)}
                          aria-label={`Serie ${setIndex + 1}: marcar como completada`}
                        >
                          {set.completed && <IconCheck />}
                        </button>
                        <div className={styles.setInfo}>
                          <span className={styles.setIndex}>Serie {setIndex + 1}</span>
                          <span className={styles.setGoal}>
                            Objetivo {template.targetReps} reps ·{' '}
                            {template.bodyweight
                              ? 'peso corporal'
                              : `${formatWeight(template.targetWeight)} kg`}
                            {template.restSec ? ` · descanso ${template.restSec}s` : ''}
                          </span>
                        </div>
                        <div className={styles.setSteppers}>
                          <NumberField
                            label="Reps"
                            value={set.repsPerformed}
                            onChange={(v) => patchSet(exIndex, setIndex, { repsPerformed: v })}
                            onType={(v) => {
                              if (!set.completed && v > 0) completeSet(exIndex, setIndex, template, true)
                            }}
                            min={0}
                            max={99}
                            step={1}
                          />
                          <NumberField
                            label="Peso kg"
                            value={set.weightUsed}
                            onChange={(v) => patchSet(exIndex, setIndex, { weightUsed: v })}
                            min={0}
                            max={99999}
                            step={2.5}
                            unit="kg"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </main>

        <aside className={styles.aside}>
          <Timers />
        </aside>
      </div>

      <div className={styles.finish}>
        <div className={styles.dateRow}>
          <label className="label" htmlFor="sesion-date">
            Fecha de la sesión
          </label>
          <input
            id="sesion-date"
            type="date"
            className="input"
            value={logDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setLogDate(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn-accent btn-block" onClick={handleFinish}>
          Finalizar y guardar
        </button>
      </div>
    </>
  )
}