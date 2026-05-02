import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import { defineConfig, type Plugin } from 'vitest/config'

const SAFE_SUBJECT_ID = /^(?!__proto__$)(?!constructor$)(?!prototype$)[A-Za-z0-9_-]+$/

function refreshApiPlugin(): Plugin {
  let running: Promise<{ ok: boolean; log: string }> | null = null

  function runScraper(args: string[] = []) {
    return new Promise<{ ok: boolean; log: string }>((resolve) => {
      const child = spawn(process.execPath, ['scripts/ingest-questionbank.mjs', ...args], {
        cwd: process.cwd(),
        env: process.env,
      })
      const chunks: string[] = []
      child.stdout.on('data', (d) => chunks.push(d.toString()))
      child.stderr.on('data', (d) => chunks.push(d.toString()))
      child.on('close', (code) => resolve({ ok: code === 0, log: chunks.join('') }))
    })
  }

  return {
    name: 'refresh-api',
    configureServer(server) {
      server.middlewares.use('/api/refresh', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        const origin = req.headers.origin
        if (origin) {
          try {
            const originHost = new URL(origin).host
            if (originHost !== req.headers.host) {
              res.statusCode = 403
              res.end('Forbidden')
              return
            }
          } catch {
            res.statusCode = 400
            res.end('Invalid origin')
            return
          }
        }

        const url = new URL(req.url ?? '/', 'http://localhost')
        const subjectId = url.searchParams.get('subject')
        if (subjectId && !SAFE_SUBJECT_ID.test(subjectId)) {
          res.statusCode = 400
          res.end('Invalid subject id')
          return
        }
        const args = subjectId ? [`--subjects=${subjectId}`] : []
        if (!running) {
          running = runScraper(args).finally(() => {
            running = null
          })
        }
        running.then((result) => {
          res.setHeader('content-type', 'application/json')
          res.statusCode = result.ok ? 200 : 500
          res.end(JSON.stringify(result))
        })
      })
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), refreshApiPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
