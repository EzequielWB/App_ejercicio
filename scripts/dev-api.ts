import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import handler from '../api/estimate-food.ts'

const root = resolve(fileURLToPath(import.meta.url), '../..')

for (const file of ['.env.local', '.env']) {
  const path = resolve(root, file)
  if (!existsSync(path)) continue
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([\w.-]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (!m) continue
    const [, key, value] = m
    if (process.env[key] === undefined) process.env[key] = value
  }
}

const PORT = Number(process.env.API_PORT ?? 8788)

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  void handler(req, res)
})

server.listen(PORT, () => {
  console.log(`[dev-api] escuchando en http://localhost:${PORT}`)
})