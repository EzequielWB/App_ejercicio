import { useState } from 'react'
import type { FormEvent } from 'react'
import { useStore } from '../state/useStore'
import styles from './Login.module.css'

export default function Login() {
  const { login } = useStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    const ok = await login(password)
    if (!ok) setError('Contraseña incorrecta')
    setBusy(false)
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={submit} noValidate>
        <div className={styles.brand}>
          <div className={styles.logo}>B</div>
          <h1>Bitácora de Entrenamiento</h1>
          <p>Accedé a tus registros de entrenamiento</p>
        </div>

        <input
          className={`input ${styles.field}`}
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />

        {error && <p className={styles.error}>{error}</p>}

        <button className="btn btn-accent btn-block" type="submit" disabled={busy}>
          {busy ? 'Ingresando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}