import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import styles from './NumberField.module.css'

interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  onType?: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

export default function NumberField({
  label,
  value,
  onChange,
  onType,
  min = 0,
  max = 999,
  step = 1,
  unit = ''
}: Props) {
  const [text, setText] = useState(() => fmt(value))

  useEffect(() => {
    setText(fmt(value))
  }, [value])

  function stepDecimals(): number {
    return Math.max(String(step).split('.')[1]?.length ?? 0, 1)
  }

  function snap(n: number, decimals: number): number {
    return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  function fmt(v: number): string {
    const decimals = stepDecimals()
    return snap(v, decimals).toFixed(decimals).replace(/\.0+$/, '')
  }

  function commit() {
    const n = Number(text.replace(',', '.').trim())
    if (!Number.isFinite(n)) {
      setText(fmt(value))
      return
    }
    const decimals = stepDecimals()
    let next = snap(n, decimals)
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
          onChange={(e) => {
            const raw = e.target.value
            setText(raw)
            const n = Number(raw.replace(',', '.').trim())
            if (onType && raw.trim() !== '' && Number.isFinite(n)) onType(n)
          }}
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