import type { ExerciseTemplate, LibraryExercise, Profile, Routine, WorkoutLog } from '../types'

const ROUTINES_KEY = 'bitacora.routines.v1'
const LOGS_KEY = 'bitacora.logs.v1'
const PROFILE_KEY = 'bitacora.profile.v1'
const LIBRARY_KEY = 'bitacora.library.v1'

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function normalizeRoutines(routines: Routine[]): Routine[] {
  return routines.map((r) => ({
    ...r,
    schedule: r.schedule.map((d) => ({
      ...d,
      exercises: d.exercises.map((e) => ({
        ...e,
        targetReps: String(e.targetReps),
        bodyweight: e.bodyweight ?? false
      }))
    }))
  }))
}

export function loadRoutines(): Routine[] {
  return normalizeRoutines(read<Routine[]>(ROUTINES_KEY) ?? [])
}

export function saveRoutines(routines: Routine[]): void {
  write(ROUTINES_KEY, routines)
}

export function loadLogs(): WorkoutLog[] {
  return read<WorkoutLog[]>(LOGS_KEY) ?? []
}

export function saveLogs(logs: WorkoutLog[]): void {
  write(LOGS_KEY, logs)
}

export function defaultProfile(): Profile {
  return { weightKg: 75, heightCm: 175, bodyFatPct: null }
}

export function loadProfile(): Profile {
  return read<Profile>(PROFILE_KEY) ?? defaultProfile()
}

export function saveProfile(profile: Profile): void {
  write(PROFILE_KEY, profile)
}

export function loadLibrary(): LibraryExercise[] {
  return read<LibraryExercise[]>(LIBRARY_KEY) ?? []
}

export function saveLibrary(library: LibraryExercise[]): void {
  write(LIBRARY_KEY, library)
}

export interface SeedBundle {
  routines: Routine[]
  logs: WorkoutLog[]
}

export function makeSeed(): SeedBundle {
  const ex = (
    name: string,
    sets: number,
    reps: number,
    kg: number,
    restSec?: number
  ): ExerciseTemplate => ({
    id: uid(),
    name,
    targetSets: sets,
    targetReps: String(reps),
    targetWeight: kg,
    bodyweight: false,
    restSec
  })

  const block = () => [
    ex('Sentadilla', 5, 5, 60, 120),
    ex('Press Banca', 5, 5, 50, 120),
    ex('Remo', 5, 5, 45, 120)
  ]

  const routine: Routine = {
    id: uid(),
    name: 'Fuerza 5x5',
    active: true,
    schedule: [1, 3, 5].map((day) => ({ dayOfWeek: day, exercises: block() }))
  }

  const now = Date.now()
  const logs: WorkoutLog[] = [0, 1, 2, 3, 4, 5].map((i) => {
    const date = new Date(now - (18 - i * 3) * 86400000)
    const done = (weight: number) =>
      Array.from({ length: 5 }, () => ({
        repsPerformed: 5,
        weightUsed: weight,
        completed: true
      }))
    return {
      id: uid(),
      routineId: routine.id,
      date: date.toISOString(),
      completedExercises: [
        { exerciseName: 'Sentadilla', sets: done(60 + i * 2.5) },
        { exerciseName: 'Press Banca', sets: done(50 + i * 2.5) },
        { exerciseName: 'Remo', sets: done(45 + i * 2.5) }
      ]
    }
  })

  return { routines: [routine], logs }
}