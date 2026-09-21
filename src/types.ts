export interface ExerciseTemplate {
  id: string
  name: string
  targetSets: number
  targetReps: string
  targetWeight: number
  bodyweight?: boolean
  restSec?: number
}

export interface ScheduleDay {
  dayOfWeek: number
  exercises: ExerciseTemplate[]
}

export interface Routine {
  id: string
  name: string
  active: boolean
  schedule: ScheduleDay[]
}

export interface SetRecord {
  repsPerformed: number
  weightUsed: number
  completed: boolean
}

export interface CompletedExercise {
  exerciseName: string
  sets: SetRecord[]
}

export interface WorkoutLog {
  id: string
  routineId: string
  date: string
  completedExercises: CompletedExercise[]
}

export interface Profile {
  weightKg: number
  heightCm: number
  bodyFatPct: number | null
}

export interface LibraryExercise {
  id: string
  name: string
  maxWeight: number
  maxReps: number
  maxE1RM: number
  times: number
  lastDate: string | null
}