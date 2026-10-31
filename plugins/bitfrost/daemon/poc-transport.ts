// SPDX-License-Identifier: GPL-3.0-only
// Opt-in transport for the Windows POC. Never exposed on a network interface.
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import type http from 'node:http'
import { RUN_DIR, SOCKET } from './config.ts'

export const HTTP_POC = process.env.BITFROST_HTTP_POC === '1'
export const ENDPOINT = path.join(RUN_DIR, 'endpoint.json')
export function clientOptions(): http.RequestOptions {
  if (!HTTP_POC) return { socketPath: SOCKET }
  const e = JSON.parse(fs.readFileSync(ENDPOINT, 'utf8'))
  if (e.hostname !== '127.0.0.1' || !Number.isInteger(e.port) || e.port < 1 || e.port > 65535 || !/^[a-f0-9]{64}$/.test(e.token)) throw new Error('Invalid local POC endpoint')
  return { hostname: e.hostname, port: e.port, headers: { 'x-bitfrost-poc-token': e.token } }
}

export function serverTransport() {
  const token = randomBytes(32).toString('hex')
  let port = 0
  return {
    accepts(req: http.IncomingMessage) {
      if (!HTTP_POC) return true
      const received = req.headers['x-bitfrost-poc-token']
      return !req.headers.origin && req.headers.host === `127.0.0.1:${port}` &&
        typeof received === 'string' && /^[a-f0-9]{64}$/.test(received) &&
        timingSafeEqual(Buffer.from(received), Buffer.from(token))
    },
    listen(server: http.Server, ready: () => void) {
      if (!HTTP_POC) {
        try { fs.unlinkSync(SOCKET) } catch {}
        server.listen(SOCKET, () => { fs.chmodSync(SOCKET, 0o600); ready() })
        return
      }
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as { port: number }).port
        const temporary = `${ENDPOINT}.${process.pid}.tmp`
        fs.writeFileSync(temporary, JSON.stringify({ hostname: '127.0.0.1', port, token, pid: process.pid }), { mode: 0o600 })
        fs.renameSync(temporary, ENDPOINT)
        ready()
      })
    },
    cleanup() {
      if (!HTTP_POC) return
      try { if (JSON.parse(fs.readFileSync(ENDPOINT, 'utf8')).token === token) fs.unlinkSync(ENDPOINT) } catch {}
    },
  }
}
