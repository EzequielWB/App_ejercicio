import { useState } from 'react'
import type { FormEvent } from 'react'
import NumberField from '../components/NumberField'
import { useStore } from '../state/useStore'
import { formatWeight } from '../utils'
import styles from './Perfil.module.css'

function imcCategory(imc: number): string {
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Normal'
  if (imc < 30) return 'Sobrepeso'
  return 'Obesidad'
}

export default function Perfil() {
  const { state, dispatch, logout } = useStore()
  const [weight, setWeight] = useState(state.profile.weightKg)
  const [height, setHeight] = useState(state.profile.heightCm)
  const [trackFat, setTrackFat] = useState(state.profile.bodyFatPct !== null)
  const [fat, setFat] = useState(state.profile.bodyFatPct ?? 0)
  const [saved, setSaved] = useState(false)

  const imc = weight > 0 && height > 0 ? weight / Math.pow(height / 100, 2) : null
  const hM = height > 0 ? height / 100 : 0
  const kgFor = (value: number) => `${(value * hM * hM).toFixed(1)} kg`

  const ranges = [
    {
      label: 'Bajo peso',
      min: kgFor(0),
      max: kgFor(18.5),
      on: imc !== null && imc < 18.5,
      cls: styles.low
    },
    {
      label: 'Normal',
      min: kgFor(18.5),
      max: kgFor(25),
      on: imc !== null && imc >= 18.5 && imc < 25,
      cls: styles.normal
    },
    {
      label: 'Sobrepeso',
      min: kgFor(25),
      max: kgFor(30),
      on: imc !== null && imc >= 25 && imc < 30,
      cls: styles.high
    },
    {
      label: 'Obesidad',
      min: kgFor(30),
      max: '',
      on: imc !== null && imc >= 30,
      cls: styles.obese
    }
  ]

  let guide = ''
  if (hM > 0 && imc !== null) {
    if (imc < 18.5) {
      guide = `Para entrar en el rango normal apuntá a ${kgFor(18.5)} como mínimo (IMC 18.5).`
    } else if (imc < 25) {
      guide = 'Estás dentro del rango normal.'
    } else if (imc < 30) {
      guide = `Para salir del sobrepeso apuntá a ${kgFor(25)} como máximo (IMC 25).`
    } else {
      guide = `Para salir de la obesidad apuntá a ${kgFor(30)} (IMC 30); el límite del rango normal es ${kgFor(25)} (IMC 25).`
    }
  }

  const fatKg = trackFat && weight > 0 && fat > 0 ? (weight * fat) / 100 : null
  const leanKg = fatKg !== null ? weight - fatKg : null
  const fmi = fatKg !== null && hM > 0 ? fatKg / (hM * hM) : null

  let fmiLabel = ''
  let fmiCls = ''
  if (fmi !== null) {
    if (fmi < 4) {
      fmiLabel = 'Por debajo'
      fmiCls = styles.low
    } else if (fmi <= 9) {
      fmiLabel = 'En rango'
      fmiCls = styles.normal
    } else {
      fmiLabel = 'Elevado'
      fmiCls = styles.high
    }
  }

  const fatHigh = fat > 25
  const contradiction = imc !== null && imc >= 18.5 && imc < 25 && fatHigh

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    dispatch({
      type: 'updateProfile',
      profile: {
        weightKg: weight,
        heightCm: height,
        bodyFatPct: trackFat ? fat : null
      }
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <>
      <header className="head">
        <div>
          <div className="kicker">Datos personales</div>
          <h1>Perfil</h1>
        </div>
      </header>

      <form onSubmit={handleSave} noValidate>
        <section className={styles.section}>
          <div className={styles.rows}>
            <NumberField
              label="Peso"
              value={weight}
              onChange={setWeight}
              min={30}
              max={250}
              step={0.5}
              unit="kg"
            />
            <NumberField
              label="Altura"
              value={height}
              onChange={setHeight}
              min={100}
              max={230}
              step={0.5}
              unit="cm"
            />
          </div>

          <label className={styles.check}>
            <input
              type="checkbox"
              checked={trackFat}
              onChange={(e) => setTrackFat(e.target.checked)}
            />
            <span>Registrar % de grasa corporal</span>
          </label>

          {trackFat && (
            <NumberField
              label="Grasa corporal"
              value={fat}
              onChange={setFat}
              min={1}
              max={60}
              step={0.1}
              unit="%"
            />
          )}
        </section>

        <section className={styles.imcCard}>
          <span className="kicker">IMC</span>
          {imc !== null ? (
            <>
              <div className={`${styles.imcValue} text-num`}>{imc.toFixed(1)}</div>
              <div className={`${styles.imcCat} ${imcCatClass(imc)}`}>{imcCategory(imc)}</div>
              <p className={styles.imcHint}>
                Peso {formatWeight(weight)} kg · Altura {formatWeight(height)} cm
              </p>
            </>
          ) : (
            <p className={styles.imcHint}>Completá peso y altura para calcular el IMC.</p>
          )}

          {hM > 0 && (
            <>
              <div className={styles.rangeList}>
                {ranges.map((r) => (
                  <div
                    key={r.label}
                    className={`${styles.rangeRow} ${r.on ? `${styles.rangeOn} ${r.cls}` : ''}`}
                  >
                    <span className={styles.rangeLabel}>{r.label}</span>
                    <span className={styles.rangeVal}>
                      {r.max ? `${r.min} – ${r.max}` : `desde ${r.min}`}
                    </span>
                  </div>
                ))}
              </div>
              {guide && <p className={styles.imcGuide}>{guide}</p>}

              {fatKg !== null && (
                <div className={styles.metrics}>
                  <div className={styles.metric}>
                    <span>Masa grasa</span>
                    <span className="text-num">{fatKg.toFixed(1)} kg</span>
                  </div>
                  <div className={styles.metric}>
                    <span>Masa magra</span>
                    <span className="text-num">{(leanKg ?? 0).toFixed(1)} kg</span>
                  </div>
                  {fmi !== null && (
                    <div className={styles.metric}>
                      <span>FMI (índice de masa grasa)</span>
                      <span className="text-num">
                        {fmi.toFixed(1)}
                        <span className={`${styles.metricTag} ${fmiCls}`}>{fmiLabel}</span>
                      </span>
                    </div>
                  )}
                  <p className={styles.fmiNote}>
                    Referencia de FMI saludable en adultos: 4 – 9.
                  </p>
                </div>
              )}

              {contradiction && (
                <p className={styles.warn}>
                  Tu IMC da normal, pero tu % de grasa corporal es alto: podrías estar en la zona
                  de obesidad de peso normal.
                </p>
              )}
            </>
          )}
        </section>

        <div className={styles.footer}>
          <button type="submit" className="btn btn-accent btn-block">
            Guardar
          </button>
          <button type="button" className="btn btn-block" onClick={() => void logout()}>
            Cerrar sesión
          </button>
          {saved && <p className={styles.saved}>Guardado.</p>}
        </div>
      </form>
    </>
  )
}

function imcCatClass(imc: number): string {
  if (imc < 18.5) return styles.low
  if (imc < 25) return styles.normal
  if (imc < 30) return styles.high
  return styles.obese
}