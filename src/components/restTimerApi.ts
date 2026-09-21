type StartFn = (seconds: number) => void

let current: StartFn | null = null

export function registerRestStart(fn: StartFn | null): void {
  current = fn
}

export function restStart(seconds: number): void {
  current?.(seconds)
}