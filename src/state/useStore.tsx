import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { LibraryExercise, Profile, Routine, WorkoutLog } from '../types'
import { mergeLibrary, normalize } from '../utils'
import {
  defaultProfile,
  loadLibrary,
  loadLogs,
  loadProfile,
  loadRoutines,
  makeSeed,
  normalizeRoutines,
  saveLibrary,
  saveLogs,
  saveProfile,
  saveRoutines
} from '../storage/db'
import {
  cloudLoad,
  cloudLogin,
  cloudLogout,
  cloudSave,
  clearSessionToken,
  getSessionToken,
  setSessionToken
} from '../lib/supabase'
import type { CloudBundle } from '../lib/supabase'

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
  | { type: 'hydrate'; data: CloudBundle }

export interface AuthState {
  ready: boolean
  authed: boolean
}

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
      const routines = idx === -1
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
    case 'hydrate': {
      const data = action.data
      const library: LibraryExercise[] =
        data.library && data.library.length > 0
          ? data.library
          : (data.logs ?? []).reduce(
              (acc, log) => mergeLibrary(acc, log),
              [] as LibraryExercise[]
            )
      return {
        routines: normalizeRoutines(data.routines ?? []),
        logs: data.logs ?? [],
        profile: { ...defaultProfile(), ...(data.profile ?? {}) },
        library
      }
    }
    default:
      return state
  }
}

function hasData(data: CloudBundle | null): boolean {
  if (!data) return false
  if ((data.routines ?? []).length > 0) return true
  if ((data.logs ?? []).length > 0) return true
  if ((data.library ?? []).length > 0) return true
  const profile = data.profile
  return profile !== undefined && JSON.stringify(profile) !== JSON.stringify(defaultProfile())
}

interface StoreCtx {
  state: State
  dispatch: Dispatch<Action>
  auth: AuthState
  login: (password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)
  const [auth, setAuth] = useState<AuthState>({ ready: false, authed: false })
  const tokenRef = useRef<string | null>(null)

  const login = useCallback(async (password: string) => {
    const res = await cloudLogin(password)
    if (!res) return false
    tokenRef.current = res.token
    setSessionToken(res.token)
    if (hasData(res.data)) {
      dispatch({ type: 'hydrate', data: res.data! })
    }
    setAuth({ ready: true, authed: true })
    return true
  }, [])

  const logout = useCallback(async () => {
    const token = tokenRef.current
    tokenRef.current = null
    if (token) void cloudLogout(token)
    setAuth({ ready: true, authed: false })
  }, [])

  useEffect(() => {
    let cancelled = false
    const token = getSessionToken()
    if (!token) {
      setAuth({ ready: true, authed: false })
      return
    }
    tokenRef.current = token
    void cloudLoad(token).then((res) => {
      if (cancelled) return
      if (res.status === 'ok' && hasData(res.data)) {
        dispatch({ type: 'hydrate', data: res.data! })
        setAuth({ ready: true, authed: true })
      } else if (res.status === 'ok') {
        clearSessionToken()
        tokenRef.current = null
        setAuth({ ready: true, authed: false })
      } else {
        setAuth({ ready: true, authed: true })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

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

  useEffect(() => {
    if (!auth.authed) return
    const bundle: CloudBundle = {
      routines: state.routines,
      logs: state.logs,
      profile: state.profile,
      library: state.library
    }
    const timer = window.setTimeout(() => {
      if (tokenRef.current) void cloudSave(tokenRef.current, bundle)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [state, auth.authed])

  return (
    <Ctx.Provider value={{ state, dispatch, auth, login, logout }}>{children}</Ctx.Provider>
  )
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}