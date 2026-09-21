import type { ActivityLevel, Profile, Sex } from './types'

export const SEX_LABELS: Record<Sex, string> = {
  male: 'Hombre',
  female: 'Mujer'
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  active: 'Activo',
  veryActive: 'Muy activo'
}

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9
}

function round10(n: number): number {
  return Math.max(0, Math.round(n / 10) * 10)
}

export function bmr(profile: Profile): number {
  const lean = profile.bodyFatPct != null ? profile.weightKg * (1 - profile.bodyFatPct / 100) : null
  if (lean != null && lean > 0) {
    return 370 + 21.6 * lean
  }
  const h = profile.heightCm
  if (profile.sex === 'female') {
    return 10 * profile.weightKg + 6.25 * h - 5 * profile.age - 161
  }
  return 10 * profile.weightKg + 6.25 * h - 5 * profile.age + 5
}

export function tdee(profile: Profile): number {
  return bmr(profile) * ACTIVITY_FACTORS[profile.activity]
}

export type TargetId = 'mantenimiento' | 'deficit' | 'volumen'

export interface CalorieTarget {
  id: TargetId
  label: string
  delta: string
  kcal: number
  proteinG: number
  fatG: number
  carbsG: number
}

export function calorieTargets(profile: Profile): CalorieTarget[] {
  const maint = round10(tdee(profile))
  const proteinG = Math.round(profile.weightKg * 2)
  const fatG = Math.round(profile.weightKg * 0.9)
  const build = (id: TargetId, label: string, delta: string, kcal: number): CalorieTarget => {
    const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4))
    return { id, label, delta, kcal: round10(kcal), proteinG, fatG, carbsG }
  }
  return [
    build('mantenimiento', 'Mantenimiento', 'TDEE', maint),
    build('deficit', 'Déficit', '− 400 kcal', maint - 400),
    build('volumen', 'Volumen', '+ 300 kcal', maint + 300)
  ]
}