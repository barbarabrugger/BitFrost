// SPDX-License-Identifier: GPL-3.0-only
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
process.env.BITFROST_HTTP_POC = '1'
process.env.BITFROST_RUNTIME_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bitfrost-transport-'))
const { serverTransport, clientOptions, ENDPOINT } = await import('../plugins/bitfrost/daemon/poc-transport.ts')
test('local transport authenticates requests, refuses browser origins and cleans up only its own endpoint', async t => {
  const transport = serverTransport()
  const server = http.createServer((req, res) => { res.statusCode = transport.accepts(req) ? 200 : 403; res.end('test') })
  t.after(async () => { await new Promise(resolve => server.close(resolve)); transport.cleanup(); fs.rmSync(process.env.BITFROST_RUNTIME_DIR, { recursive: true, force: true }) })
  await new Promise(resolve => transport.listen(server, resolve))
  const endpoint = JSON.parse(fs.readFileSync(ENDPOINT, 'utf8'))
  assert.equal(server.address().address, '127.0.0.1')
  const options = clientOptions()
  const url = `http://127.0.0.1:${endpoint.port}/health`
  assert.equal((await fetch(url)).status, 403)
  assert.equal((await fetch(url, { headers: options.headers })).status, 200)
  for (const headers of [
    { ...options.headers, 'x-bitfrost-poc-token': '0'.repeat(64) },
    { ...options.headers, 'x-bitfrost-poc-token': 'é'.repeat(64) },
    { ...options.headers, Origin: 'https://example.com' },
  ]) assert.equal((await fetch(url, { headers })).status, 403)
  const wrongHost = await new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { ...options.headers, Host: 'example.com' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)) })
    req.on('error', reject)
  })
  assert.equal(wrongHost, 403)
  fs.writeFileSync(ENDPOINT, JSON.stringify({ ...endpoint, token: 'b'.repeat(64) }))
  transport.cleanup()
  assert.ok(fs.existsSync(ENDPOINT), 'must not remove a replacement process endpoint')
  fs.writeFileSync(ENDPOINT, JSON.stringify({ ...endpoint, hostname: 'example.com' }))
  assert.throws(clientOptions, /Invalid local POC endpoint/)
  fs.writeFileSync(ENDPOINT, JSON.stringify(endpoint))
  transport.cleanup()
  assert.equal(fs.existsSync(ENDPOINT), false)
})
