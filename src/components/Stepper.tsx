import styles from './Stepper.module.css'

interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  decimals?: number
  unit?: string
}

export default function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  decimals = 0,
  unit = ''
}: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const display =
    unit || decimals > 0
      ? `${value.toFixed(decimals).replace(/\.0$/, '')}${unit ? ` ${unit}` : ''}`
      : String(clamp(Math.round(value)))

  return (
    <div className={styles.stepper}>
      <span className={styles.label}>{label}</span>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => onChange(clamp(value - step))}
          disabled={value - step < min}
          aria-label={`Reducir ${label}`}
        >
          −
        </button>
        <span className={`${styles.value} text-num`}>{display}</span>
        <button
          type="button"
          className={styles.btn}
          onClick={() => onChange(clamp(value + step))}
          disabled={value + step > max}
          aria-label={`Aumentar ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}