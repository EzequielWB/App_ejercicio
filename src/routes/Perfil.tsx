import { useState } from 'react'
import type { FormEvent } from 'react'
import NumberField from '../components/NumberField'
import { useStore } from '../state/useStore'
import { formatWeight } from '../utils'
import { ACTIVITY_LABELS, calorieTargets } from '../nutrition'
import type { ActivityLevel, Profile, Sex } from '../types'
import styles from './Perfil.module.css'

interface FoodEstimate {
  kcal: number
  protein: number
  carbs: number
  fat: number
  comment: string
  model?: string
  provider?: string
}

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
  const [age, setAge] = useState(state.profile.age)
  const [sex, setSex] = useState<Sex>(state.profile.sex)
  const [activity, setActivity] = useState<ActivityLevel>(state.profile.activity)
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const [aiText, setAiText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiResult, setAiResult] = useState<FoodEstimate | null>(null)

  const liveProfile: Profile = {
    weightKg: weight,
    heightCm: height,
    bodyFatPct: trackFat ? fat : null,
    age,
    sex,
    activity
  }
  const targets = calorieTargets(liveProfile)
  const maintKcal = targets.find((t) => t.id === 'mantenimiento')?.kcal ?? 0
  const aiDiff = aiResult ? aiResult.kcal - maintKcal : null

  const estimate = async () => {
    if (!aiText.trim() || aiBusy) return
    setAiBusy(true)
    setAiError('')
    setAiResult(null)
    try {
      const res = await fetch('/api/estimate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText.trim(), targetKcal: maintKcal })
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        throw new Error(msg || `Error ${res.status}`)
      }
      const data = (await res.json()) as FoodEstimate
      setAiResult({
        kcal: Math.round(data.kcal),
        protein: Math.round(data.protein),
        carbs: Math.round(data.carbs),
        fat: Math.round(data.fat),
        comment: data.comment,
        model: data.model,
        provider: data.provider
      })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'No se pudo estimar. Probá de nuevo.')
    } finally {
      setAiBusy(false)
    }
  }

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
        bodyFatPct: trackFat ? fat : null,
        age,
        sex,
        activity
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
        <section className={styles.dataCard}>
          <span className="kicker">Datos físicos</span>
          <div className={styles.rows}>
            <div className={styles.pair}>
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

          <div className={styles.pair}>
            <NumberField
              label="Edad"
              value={age}
              onChange={setAge}
              min={10}
              max={100}
              step={1}
              unit="años"
            />
            <label className={styles.fields}>
              <span className={styles.fieldsLabel}>Sexo</span>
              <select
                className={styles.dataSelect}
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
              >
                <option value="male">Hombre</option>
                <option value="female">Mujer</option>
              </select>
            </label>
          </div>

          <label className={styles.fields}>
            <span className={styles.fieldsLabel}>Nivel de actividad</span>
            <select
              className={styles.dataSelect}
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          </div>
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

        <section className={styles.calCard}>
          <span className="kicker">Objetivo calórico diario</span>
          <div className={styles.targets}>
            {targets.map((t) => (
              <div
                key={t.id}
                className={`${styles.targetCard} ${t.id === 'mantenimiento' ? styles.targetOn : ''}`}
              >
                <div className={styles.targetHead}>
                  <span className={styles.targetLabel}>{t.label}</span>
                  <span className={styles.targetDelta}>{t.delta}</span>
                </div>
                <div className={`${styles.targetKcal} text-num`}>{t.kcal}</div>
                <div className={styles.targetUnit}>kcal/día</div>
                <div className={styles.targetMacros}>
                  <span>P {t.proteinG}g</span>
                  <span>C {t.carbsG}g</span>
                  <span>G {t.fatG}g</span>
                </div>
              </div>
            ))}
          </div>
          <p className={styles.calHint}>
            Mifflin‑St Jeor / Katch‑McArdle (según % grasa) · proteína 2 g/kg · grasa 0.9 g/kg.
          </p>
        </section>

        <section className={styles.aiSection}>
          <span className="kicker">Lo que comí hoy</span>
          <p className={styles.aiIntro}>
            Escribí más o menos lo que comiste hoy y la IA estima calorías y macros, para tener
            una idea de si comiste de más o de menos.
          </p>
          <textarea
            className={styles.aiInput}
            rows={5}
            placeholder="Ej: un plato de fideos con tuco y queso, dos milanesas con puré, un sándwich de milanesa, una manzana y una gaseosa."
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-accent btn-block"
            onClick={() => void estimate()}
            disabled={aiBusy || !aiText.trim()}
          >
            {aiBusy ? 'Estimando…' : 'Estimar con IA'}
          </button>
          <p className={styles.aiNote}>
            Estimación aproximada. La cantidad de kcal se compara con tu mantenimiento ({maintKcal}{' '}
            kcal).
          </p>
          {aiError && <p className={styles.aiError}>{aiError}</p>}
          {aiResult && (
            <div className={styles.aiResult}>
              <div className={styles.aiKcalRow}>
                <div className={`${styles.aiKcal} text-num`}>{aiResult.kcal}</div>
                <div className={styles.aiKcalUnit}>kcal aprox.</div>
              </div>
              <div className={styles.aiMacros}>
                <span>Proteína {aiResult.protein}g</span>
                <span>Carbos {aiResult.carbs}g</span>
                <span>Grasa {aiResult.fat}g</span>
              </div>
              {aiDiff !== null && aiDiff !== 0 && (
                <p className={aiDiff >= 0 ? styles.aiHigh : styles.aiLow}>
                  {aiDiff >= 0
                    ? `Te pasaste ${aiDiff} kcal del mantenimiento.`
                    : `Te faltan ${Math.abs(aiDiff)} kcal para tu mantenimiento.`}
                </p>
              )}
              {aiDiff !== null && aiDiff === 0 && (
                <p className={styles.aiOk}>Estás justo en tu mantenimiento.</p>
              )}
              {aiResult.comment && <p className={styles.aiComment}>{aiResult.comment}</p>}
              {aiResult.model && (
                <p className={styles.aiModel}>
                  {aiResult.provider === 'groq' ? 'Groq' : 'OpenRouter'} · {aiResult.model}
                </p>
              )}
            </div>
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

        <section className={styles.danger}>
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => {
              if (confirmReset) {
                dispatch({ type: 'resetAll' })
                setConfirmReset(false)
              } else {
                setConfirmReset(true)
              }
            }}
          >
            {confirmReset ? 'Confirmar: borrar todos los datos' : 'Borrar todos los datos'}
          </button>
          {!confirmReset && (
            <p className={styles.dangerHint}>
              Borra rutinas, sesiones, biblioteca y perfil (incluido lo guardado en la nube).
            </p>
          )}
        </section>
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