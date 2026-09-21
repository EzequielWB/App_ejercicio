import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LibraryExercise, Profile, Routine, WorkoutLog } from '../types'

export interface CloudBundle {
  routines: Routine[]
  logs: WorkoutLog[]
  profile: Profile
  library: LibraryExercise[]
}

export type CloudResult =
  | { status: 'ok'; data: CloudBundle | null }
  | { status: 'error' }

const SESSION_KEY = 'bitacora.session.v1'

const env = import.meta.env as Record<string, string | undefined>
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY

function client(): SupabaseClient | null {
  return URL && KEY ? createClient(URL, KEY) : null
}

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token)
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_KEY)
}

export async function cloudLogin(
  password: string
): Promise<{ token: string; data: CloudBundle | null } | null> {
  const sb = client()
  if (!sb) return null
  const { data: token, error } = await sb.rpc('app_login', { p_password: password })
  if (error || typeof token !== 'string') return null
  setSessionToken(token)
  const res = await cloudLoad(token)
  return { token, data: res.status === 'ok' ? res.data : null }
}

export async function cloudLoad(token: string): Promise<CloudResult> {
  const sb = client()
  if (!sb) return { status: 'error' }
  const { data, error } = await sb.rpc('app_load', { p_token: token })
  if (error) return { status: 'error' }
  if (data === null || data === undefined) return { status: 'ok', data: null }
  return { status: 'ok', data: data as CloudBundle }
}

export async function cloudSave(token: string, bundle: CloudBundle): Promise<boolean> {
  const sb = client()
  if (!sb) return false
  const { error } = await sb.rpc('app_save', { p_token: token, p_data: bundle })
  return !error
}

export async function cloudLogout(token: string): Promise<void> {
  const sb = client()
  clearSessionToken()
  if (!sb) return
  try {
    await sb.rpc('app_logout', { p_token: token })
  } catch {
    /* sin conexión: la sesión expira sola en Supabase */
  }
}