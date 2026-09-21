import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = { maxDuration: 60 }

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OR_MODELS_URL = 'https://openrouter.ai/api/v1/models'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models'

const OR_PREFERRED = [
  'openrouter/free',
  'z-ai/glm-5.2:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'minimax/minimax-m3:free',
  'thinkingmachines/inkling-small:free',
  'nvidia/nemotron-3.5-lightning:free'
]

const GROQ_PREFERRED = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'groq/compound',
  'groq/compound-mini',
  'qwen/qwen3.8-27b',
  'allam-2-7b'
]

let cachedOrModels: string[] | null = null
let cachedGroqModels: string[] | null = null

async function discoverOrModels(key: string): Promise<string[]> {
  if (cachedOrModels) return cachedOrModels
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(OR_MODELS_URL, {
      headers: { Authorization: `Bearer ${key}` },
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (!res.ok) {
      cachedOrModels = OR_PREFERRED
      return cachedOrModels
    }
    const data = (await res.json()) as { data?: Array<{ id?: string }> }
    const free = (data.data ?? [])
      .map((m) => m.id ?? '')
      .filter((id) => id.endsWith(':free') && id !== 'openrouter/free')
    const seen = new Set<string>()
    const out: string[] = []
    for (const id of [...OR_PREFERRED, ...free]) {
      if (!seen.has(id)) {
        seen.add(id)
        out.push(id)
      }
    }
    cachedOrModels = out
    return out
  } catch {
    cachedOrModels = OR_PREFERRED
    return cachedOrModels
  }
}

async function discoverGroqModels(key: string): Promise<string[]> {
  if (cachedGroqModels) return cachedGroqModels
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(GROQ_MODELS_URL, {
      headers: { Authorization: `Bearer ${key}` },
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (!res.ok) {
      cachedGroqModels = GROQ_PREFERRED
      return cachedGroqModels
    }
    const data = (await res.json()) as { data?: Array<{ id?: string; active?: boolean }> }
    const extra =
      (data.data ?? [])
        .map((m) => m.id ?? '')
        .filter((id) => !/whisper|orpheus|prompt-guard|content-safety|rerank|embed/i.test(id))
        .filter((id) => /oss|compound|qwen|allam|gemma|llama|mixtral/i.test(id))
    const seen = new Set<string>()
    const out: string[] = []
    for (const id of [...GROQ_PREFERRED, ...extra]) {
      if (!seen.has(id)) {
        seen.add(id)
        out.push(id)
      }
    }
    cachedGroqModels = out
    return out
  } catch {
    cachedGroqModels = GROQ_PREFERRED
    return cachedGroqModels
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.end(JSON.stringify(payload))
}

function parseJsonContent(raw: string): Record<string, unknown> | null {
  const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    const match = /\{(?:[^{}]|"[^"]*")*\}/.exec(text)
    if (!match) return null
    try {
      return JSON.parse(match[0]) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  return Number.isFinite(n) ? n : 0
}

interface Attempt {
  ok: boolean
  content?: string
  status: number
  message: string
  rateLimited?: boolean
}

async function chatCompletion(opts: {
  baseUrl: string
  apiKey: string
  model: string
  messages: Array<{ role: string; content: string }>
  timeoutMs: number
}): Promise<Attempt> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), Math.max(2000, opts.timeoutMs))
  try {
    const res = await fetch(opts.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: opts.messages
      }),
      signal: ctrl.signal
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      if (res.status === 429) {
        return { ok: false, status: 429, message: detail.slice(0, 300), rateLimited: true }
      }
      return { ok: false, status: res.status, message: detail.slice(0, 240) }
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) return { ok: false, status: 200, message: 'La IA devolvió una respuesta vacía.' }
    return { ok: true, content, status: 200, message: '' }
  } catch (err) {
    const msg =
      err instanceof Error ? (err.name === 'AbortError' ? 'timeout de la IA' : err.message) : 'error desconocido'
    return { ok: false, status: 0, message: msg }
  } finally {
    clearTimeout(timer)
  }
}

interface AskOutcome {
  success: boolean
  rateLimited: boolean
  lastError: string
  parsed?: Record<string, unknown>
  model?: string
}

async function askModels(opts: {
  baseUrl: string
  apiKey: string
  models: string[]
  messages: Array<{ role: string; content: string }>
  deadline: number
  maxAttempts: number
}): Promise<AskOutcome> {
  let lastError = 'No se pudo contactar a la IA.'
  let rateLimited = false
  for (let i = 0; i < opts.models.length && i < opts.maxAttempts; i++) {
    if (Date.now() > opts.deadline) break
    const model = opts.models[i]
    const attempt = await chatCompletion({
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
      model,
      messages: opts.messages,
      timeoutMs: Math.min(15000, Math.max(3000, opts.deadline - Date.now()))
    })
    if (attempt.rateLimited) {
      rateLimited = true
      lastError = `rate limit (${attempt.message || 'cupo agotado'})`
      break
    }
    if (attempt.ok && attempt.content !== undefined) {
      const parsed = parseJsonContent(attempt.content)
      if (parsed) {
        return { success: true, rateLimited: false, lastError: '', parsed, model }
      }
      lastError = `El modelo ${model} devolvió una respuesta inválida.`
      continue
    }
    lastError = `El modelo ${model} no respondió (${attempt.message || `HTTP ${attempt.status}`}).`
  }
  return { success: false, rateLimited, lastError }
}

function sendEstimate(
  res: ServerResponse,
  parsed: Record<string, unknown>,
  model: string,
  provider: string
): void {
  send(res, 200, {
    kcal: Math.round(Math.max(0, num(parsed.kcal))),
    protein: Math.round(Math.max(0, num(parsed.protein))),
    carbs: Math.round(Math.max(0, num(parsed.carbs))),
    fat: Math.round(Math.max(0, num(parsed.fat))),
    comment: typeof parsed.comment === 'string' ? parsed.comment.slice(0, 280) : '',
    model,
    provider
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.end()
    return
  }
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Método no permitido' })
    return
  }

  const orKey = process.env.OPENROUTER_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (!orKey && !groqKey) {
    send(res, 500, { error: 'No hay ninguna key de IA configurada en el servidor.' })
    return
  }

  let body: { text?: unknown; targetKcal?: unknown }
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw) as typeof body
  } catch {
    send(res, 400, { error: 'JSON inválido' })
    return
  }

  const text = String(body.text ?? '').trim()
  const targetKcal = num(body.targetKcal)

  if (!text) {
    send(res, 400, { error: 'Falta el texto con lo que comiste.' })
    return
  }
  if (text.length > 3000) {
    send(res, 400, { error: 'El texto es muy largo (máximo 3000 caracteres).' })
    return
  }

  const system = [
    'Sos un nutricionista. Estimás cuántas calorías y macros comió una persona en el día',
    'a partir de una descripción informal en español. Respondés SOLO JSON válido, sin texto extra,',
    'con esta forma exacta:',
    '{"kcal": <numero>, "protein": <gramos>, "carbs": <gramos>, "fat": <gramos>, "comment": "<frase corta en español>"}',
    'Redondeá kcal a enteros y los macros a gramos enteros. El comment debe ser una frase breve y práctica',
    'diciendo si comió poco, está cerca del objetivo o se pasó (fijate también en el objetivo diario que se te pasa).',
    'Si falta información, estimá lo más razonable posible.'
  ].join(' ')

  const user =
    (targetKcal > 0
      ? `Objetivo diario de mantenimiento: ${targetKcal} kcal.\n\n`
      : 'No hay objetivo diario informado.\n\n') +
    `Comida del día:\n${text}`

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ] as Array<{ role: string; content: string }>

  const deadline = Date.now() + 25000
  let lastError = ''

  if (orKey) {
    const orModels = await discoverOrModels(orKey)
    const out = await askModels({
      baseUrl: OR_URL,
      apiKey: orKey,
      models: orModels,
      messages,
      deadline,
      maxAttempts: 3
    })
    if (out.success) {
      sendEstimate(res, out.parsed!, out.model!, 'openrouter')
      return
    }
    lastError = out.lastError
    if (out.rateLimited && !groqKey) {
      send(res, 429, {
        error:
          'Llegaste al límite diario de modelos gratis de OpenRouter (50 por día). ' +
          'Podés agregar una vez 10 dólares de crédito y pasan a ser 1000 gratis por día, ' +
          'o esperar a que se renueve el cupo (24 h).'
      })
      return
    }
  }

  if (groqKey) {
    const groqModels = await discoverGroqModels(groqKey)
    const out = await askModels({
      baseUrl: GROQ_URL,
      apiKey: groqKey,
      models: groqModels,
      messages,
      deadline,
      maxAttempts: 4
    })
    if (out.success) {
      sendEstimate(res, out.parsed!, out.model!, 'groq')
      return
    }
    lastError = out.lastError
    if (out.rateLimited) {
      send(res, 429, {
        error: 'La IA de respaldo (Groq) también agotó su cupo. Probá más tarde.'
      })
      return
    }
  }

  send(res, 502, { error: `No se pudo estimar. ${lastError}` })
}