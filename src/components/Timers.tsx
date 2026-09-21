import { useEffect, useRef, useState } from 'react'
import { registerRestStart } from './restTimerApi'
import styles from './Timers.module.css'

const PRESETS = [30, 60, 90, 120, 180]

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtInput(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function parseDuration(text: string): number | null {
  const t = /^(\d{1,3})(?::(\d{1,2}))?$/.exec(text.trim())
  if (!t) return null
  const minutes = parseInt(t[1], 10)
  const seconds = t[2] ? parseInt(t[2], 10) : 0
  if (seconds > 59) return null
  return Math.min(3599, Math.max(0, minutes * 60 + seconds))
}

function beepTimes(times: number) {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t0 = ctx.currentTime + i * 0.45
      osc.type = 'square'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.32)
    }
  } catch {
    /* sin audio disponible */
  }
}

export default function Timers() {
  const [now, setNow] = useState(() => Date.now())

  const [swRunning, setSwRunning] = useState(false)
  const swStart = useRef(0)
  const swAccum = useRef(0)

  const [configSec, setConfigSec] = useState(60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('1:00')
  const endAt = useRef(0)
  const pausedRemaining = useRef(60000)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!swRunning && !timerRunning) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [swRunning, timerRunning])

  const elapsed = swRunning ? swAccum.current + (now - swStart.current) : swAccum.current

  const remaining = timerRunning
    ? Math.max(0, endAt.current - now)
    : pausedRemaining.current

  useEffect(() => {
    if (!timerRunning || remaining > 0) return
    setTimerRunning(false)
    setFinished(true)
    pausedRemaining.current = 0
    if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    beepTimes(3)
  }, [timerRunning, remaining])

  useEffect(() => {
    registerRestStart((seconds) => {
      pausedRemaining.current = seconds * 1000
      endAt.current = Date.now() + seconds * 1000
      setTimerRunning(true)
      setFinished(false)
      setNow(Date.now())
    })
    return () => registerRestStart(null)
  }, [])

  const applySec = (sec: number) => {
    setConfigSec(sec)
    pausedRemaining.current = sec * 1000
    setFinished(false)
  }

  const swStartTimer = () => {
    if (swRunning) {
      swAccum.current += Date.now() - swStart.current
      setSwRunning(false)
    } else {
      swStart.current = Date.now()
      setSwRunning(true)
      setNow(Date.now())
    }
  }

  const swReset = () => {
    swAccum.current = 0
    setSwRunning(false)
    setNow(Date.now())
  }

  const timerToggle = () => {
    if (timerRunning) {
      pausedRemaining.current = Math.max(0, endAt.current - Date.now())
      setTimerRunning(false)
    } else {
      if (pausedRemaining.current <= 0) return
      endAt.current = Date.now() + pausedRemaining.current
      setTimerRunning(true)
      setNow(Date.now())
      setFinished(false)
    }
  }

  const timerReset = () => {
    pausedRemaining.current = configSec * 1000
    setTimerRunning(false)
    setFinished(false)
    setNow(Date.now())
  }

  const startEdit = () => {
    setDraft(fmtInput(pausedRemaining.current / 1000))
    setEditing(true)
  }

  const commitEdit = () => {
    setEditing(false)
    const sec = parseDuration(draft)
    if (sec === null) return
    setConfigSec(sec)
    pausedRemaining.current = sec * 1000
    setFinished(false)
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Tiempos</span>
      </div>

      <div className={styles.clock}>
        <span className={styles.clockLabel}>Cronómetro</span>
        <div className={`${styles.digits} text-num`}>{fmtClock(elapsed)}</div>
        <div className={styles.clockActions}>
          <button type="button" className="btn btn-accent" onClick={swStartTimer}>
            {swRunning ? 'Pausar' : 'Iniciar'}
          </button>
          <button type="button" className="btn" onClick={swReset} disabled={elapsed === 0}>
            Reiniciar
          </button>
        </div>
      </div>

      <div className={styles.clock}>
        <span className={styles.clockLabel}>Descanso</span>

        {editing ? (
          <input
            ref={editRef}
            className={`${styles.edit} text-num`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            onBlur={commitEdit}
            inputMode="decimal"
            autoFocus
            aria-label="Editar duración del descanso"
          />
        ) : timerRunning ? (
          <div className={`${styles.digits} text-num`}>{fmtClock(remaining)}</div>
        ) : (
          <button
            type="button"
            className={`${styles.digits} ${styles.digitsBtn} text-num ${finished ? styles.done : ''}`}
            onClick={startEdit}
            aria-label="Editar duración del descanso"
          >
            {fmtClock(remaining)}
          </button>
        )}

        {!timerRunning && !editing && (
          <div className={styles.config}>
            <div className={styles.presets}>
              {PRESETS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`${styles.preset} ${configSec === sec ? styles.presetOn : ''}`}
                  onClick={() => applySec(sec)}
                >
                  {fmtInput(sec)}
                </button>
              ))}
            </div>
            <p className={styles.hint}>Clic en el reloj para editar · formato 1:30 o 90</p>
          </div>
        )}

        <div className={styles.clockActions}>
          <button
            type="button"
            className="btn btn-accent"
            onClick={timerToggle}
            disabled={!timerRunning && remaining <= 0}
          >
            {timerRunning ? 'Pausar' : 'Iniciar'}
          </button>
          <button type="button" className="btn" onClick={timerReset}>
            Reiniciar
          </button>
        </div>
      </div>
    </section>
  )
}