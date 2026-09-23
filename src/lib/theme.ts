export type Theme = 'light' | 'dark'

const THEME_KEY = 'bitacora.theme.v1'

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
}