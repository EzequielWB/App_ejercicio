import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import styles from './NumberField.module.css'

interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

export default function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit = ''
}: Props) {
  const [text, setText] = useState(() => fmt(value))

  useEffect(() => {
    setText(fmt(value))
  }, [value])

  function fmt(v: number): string {
    const decimals = Math.max(String(step).split('.')[1]?.length ?? 0, 1)
    const snapped = Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals)
    return snapped.toFixed(decimals).replace(/\.0+$/, '')
  }

  function commit() {
    const n = Number(text.replace(',', '.').trim())
    if (!Number.isFinite(n)) {
      setText(fmt(value))
      return
    }
    const decimals = Math.max(String(step).split('.')[1]?.length ?? 0, 1)
    let next = Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals)
    if (next < min) next = min
    if (next > max) next = max
    if (next !== value) onChange(next)
    setText(fmt(next))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
      e.currentTarget.blur()
    }
  }

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.inputWrap}>
        <input
          className={styles.input}
          value={text}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          onFocus={(e) => e.target.select()}
          aria-label={label}
        />
      </div>
      {unit && <span className={styles.unit}>{unit}</span>}
    </div>
  )
}