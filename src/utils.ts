import type { LibraryExercise, Routine, WorkoutLog } from './types'

export const DAY_NAMES_SHORT = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function todayIndexOfWeek(): number {
  return new Date().getDay()
}

export function todayExercises(routine: Routine | null) {
  if (!routine) return []
  const day = routine.schedule.find((d) => d.dayOfWeek === todayIndexOfWeek())
  return day?.exercises ?? []
}

function trimDecimals(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

export function formatWeight(value: number): string {
  return trimDecimals(value)
}

export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('es-AR')
  return trimDecimals(value)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

export function isSameDay(iso: string, when: Date = new Date()): boolean {
  const d = new Date(iso)
  return (
    d.getFullYear() === when.getFullYear() &&
    d.getMonth() === when.getMonth() &&
    d.getDate() === when.getDate()
  )
}

export function logVolume(log: WorkoutLog): number {
  return log.completedExercises.reduce(
    (acc, e) =>
      acc + e.sets.filter((s) => s.completed).reduce((x, s) => x + s.repsPerformed * s.weightUsed, 0),
    0
  )
}

export function logDoneSets(log: WorkoutLog): number {
  return log.completedExercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.completed).length,
    0
  )
}

export interface ExercisePoint {
  totalReps: number
  tonnage: number
}

function exerciseTotals(log: WorkoutLog): Record<string, ExercisePoint> {
  const out: Record<string, ExercisePoint> = {}
  for (const ex of log.completedExercises) {
    const sets = ex.sets.filter((s) => s.completed)
    out[ex.exerciseName] = {
      totalReps: sets.reduce((a, s) => a + s.repsPerformed, 0),
      tonnage: sets.reduce((a, s) => a + s.repsPerformed * s.weightUsed, 0)
    }
  }
  return out
}

export function exercisePoint(log: WorkoutLog, exerciseName: string): ExercisePoint | null {
  return exerciseTotals(log)[exerciseName] ?? null
}

export function previousExercisePoint(
  logs: WorkoutLog[],
  exerciseName: string,
  current: WorkoutLog
): ExercisePoint | null {
  const before = logs
    .filter((l) => l.id !== current.id && new Date(l.date).getTime() < new Date(current.date).getTime())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  for (const l of before) {
    const point = exercisePoint(l, exerciseName)
    if (point) return point
  }
  return null
}

export type Cmp = 'better' | 'equal' | 'worse'

export function cmpPoint(now: number, prev: number): Cmp {
  return now > prev ? 'better' : now < prev ? 'worse' : 'equal'
}

export function e1rm(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}

export function normalize(s: string): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export interface LibStats {
  maxWeight: number
  maxReps: number
  maxE1RM: number
}

export function exerciseLibStats(log: WorkoutLog): Record<string, LibStats> {
  const out: Record<string, LibStats> = {}
  for (const ex of log.completedExercises) {
    const sets = ex.sets.filter((s) => s.completed)
    let maxWeight = 0
    let maxReps = 0
    let maxE1RM = 0
    for (const s of sets) {
      const w = s.weightUsed
      const r = s.repsPerformed
      if (w > maxWeight) maxWeight = w
      if (r > maxReps) maxReps = r
      const e = e1rm(w, r)
      if (e > maxE1RM) maxE1RM = e
    }
    out[ex.exerciseName] = { maxWeight, maxReps, maxE1RM }
  }
  return out
}

export function mergeLibrary(library: LibraryExercise[], log: WorkoutLog): LibraryExercise[] {
  const byKey = new Map<string, LibraryExercise>()
  library.forEach((l) => byKey.set(normalize(l.name), l))
  for (const ex of log.completedExercises) {
    const key = normalize(ex.exerciseName)
    const stats = exerciseLibStats(log)[ex.exerciseName]
    const prev = byKey.get(key)
    const times = (prev?.times ?? 0) + 1
    const maxWeight = Math.max(prev?.maxWeight ?? 0, stats?.maxWeight ?? 0)
    const maxReps = Math.max(prev?.maxReps ?? 0, stats?.maxReps ?? 0)
    const maxE1RM = Math.max(prev?.maxE1RM ?? 0, stats?.maxE1RM ?? 0)
    byKey.set(key, {
      id: prev?.id ?? `lib-${Date.now().toString(36)}-${key}`,
      name: ex.exerciseName.trim(),
      maxWeight,
      maxReps,
      maxE1RM,
      times,
      lastDate: log.date
    })
  }
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}