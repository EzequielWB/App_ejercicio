import { createContext, useContext, useEffect, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { LibraryExercise, Profile, Routine, WorkoutLog } from '../types'
import { mergeLibrary, normalize } from '../utils'
import {
  loadLibrary,
  loadLogs,
  loadProfile,
  loadRoutines,
  makeSeed,
  saveLibrary,
  saveLogs,
  saveProfile,
  saveRoutines
} from '../storage/db'

export interface State {
  routines: Routine[]
  logs: WorkoutLog[]
  profile: Profile
  library: LibraryExercise[]
}

export type Action =
  | { type: 'upsertRoutine'; routine: Routine }
  | { type: 'deleteRoutine'; id: string }
  | { type: 'setActive'; id: string }
  | { type: 'addWorkoutLog'; log: WorkoutLog }
  | { type: 'deleteLog'; id: string }
  | { type: 'updateProfile'; profile: Profile }
  | { type: 'addLibraryExercise'; name: string }
  | { type: 'resetLibraryValues'; id: string }
  | { type: 'deleteLibraryExercise'; id: string }

function init(): State {
  let routines = loadRoutines()
  let logs = loadLogs()
  if (routines.length === 0 && logs.length === 0 && !localStorage.getItem('bitacora.seeded.v1')) {
    const seed = makeSeed()
    routines = seed.routines
    logs = seed.logs
    localStorage.setItem('bitacora.seeded.v1', '1')
  }
  let library = loadLibrary()
  if (library.length === 0) {
    logs.forEach((log) => {
      library = mergeLibrary(library, log)
    })
  }
  return { routines, logs, profile: loadProfile(), library }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'upsertRoutine': {
      const idx = state.routines.findIndex((r) => r.id === action.routine.id)
      const routines =
        idx === -1
          ? [...state.routines, action.routine]
          : state.routines.map((r, i) => (i === idx ? action.routine : r))
      const next = action.routine.active
        ? routines.map((r) => (r.id === action.routine.id ? r : { ...r, active: false }))
        : routines
      return { ...state, routines: next }
    }
    case 'deleteRoutine': {
      return { ...state, routines: state.routines.filter((r) => r.id !== action.id) }
    }
    case 'setActive': {
      return {
        ...state,
        routines: state.routines.map((r) => ({ ...r, active: r.id === action.id }))
      }
    }
    case 'addWorkoutLog': {
      const logs = [...state.logs, action.log].sort((a, b) => a.date.localeCompare(b.date))
      const library = mergeLibrary(state.library, action.log)
      return { ...state, logs, library }
    }
    case 'deleteLog': {
      return { ...state, logs: state.logs.filter((l) => l.id !== action.id) }
    }
    case 'updateProfile': {
      return { ...state, profile: action.profile }
    }
    case 'addLibraryExercise': {
      const key = normalize(action.name)
      if (!key) return state
      if (state.library.some((l) => normalize(l.name) === key)) return state
      const entry: LibraryExercise = {
        id: `lib-${Date.now().toString(36)}-${key}`,
        name: action.name.trim(),
        maxWeight: 0,
        maxReps: 0,
        maxE1RM: 0,
        times: 0,
        lastDate: null
      }
      return { ...state, library: [...state.library, entry].sort((a, b) => a.name.localeCompare(b.name, 'es')) }
    }
    case 'resetLibraryValues': {
      return {
        ...state,
        library: state.library.map((l) =>
          l.id === action.id ? { ...l, maxWeight: 0, maxReps: 0, maxE1RM: 0 } : l
        )
      }
    }
    case 'deleteLibraryExercise': {
      return { ...state, library: state.library.filter((l) => l.id !== action.id) }
    }
    default:
      return state
  }
}

interface StoreCtx {
  state: State
  dispatch: Dispatch<Action>
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  useEffect(() => {
    saveRoutines(state.routines)
  }, [state.routines])

  useEffect(() => {
    saveLogs(state.logs)
  }, [state.logs])

  useEffect(() => {
    saveProfile(state.profile)
  }, [state.profile])

  useEffect(() => {
    saveLibrary(state.library)
  }, [state.library])

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}