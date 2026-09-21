import { useState } from 'react'
import { useStore } from '../state/useStore'
import { formatWeight, normalize } from '../utils'
import styles from './ExerciseNameField.module.css'

interface Props {
  value: string
  onChange: (name: string) => void
  placeholder?: string
}

export default function ExerciseNameField({ value, onChange, placeholder }: Props) {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)

  const key = normalize(value)
  const inLibrary = state.library.some((l) => normalize(l.name) === key)
  const matches = state.library
    .filter((l) => (key ? normalize(l.name).includes(key) : true))
    .sort((a, b) => {
      if (key) {
        const aStart = normalize(a.name).startsWith(key) ? 0 : 1
        const bStart = normalize(b.name).startsWith(key) ? 0 : 1
        if (aStart !== bStart) return aStart - bStart
      }
      return (b.times ?? 0) - (a.times ?? 0)
    })
    .slice(0, 6)

  const close = () => setOpen(false)

  return (
    <div className={styles.wrap}>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(close, 120)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {open && (matches.length > 0 || (!inLibrary && key)) && (
        <div className={styles.list}>
          {matches.length === 0 && <div className={styles.empty}>Sin coincidencias</div>}
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              className={styles.item}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(m.name)
                close()
              }}
            >
              <span className={styles.itemName}>{m.name}</span>
              <span className={styles.itemMeta}>
                {(m.times ?? 0) > 0
                  ? `${m.times}× · máx ${formatWeight(m.maxWeight)} kg`
                  : 'aún sin usar'}
              </span>
            </button>
          ))}
          {!inLibrary && key && (
            <button
              type="button"
              className={styles.add}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => dispatch({ type: 'addLibraryExercise', name: value })}
            >
              ＋ Agregar a la biblioteca
            </button>
          )}
        </div>
      )}
    </div>
  )
}