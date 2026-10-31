// SPDX-License-Identifier: GPL-3.0-only
// Uses existing Codex login. --live makes small text-only requests in a scratch folder.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const stateArg = process.argv.indexOf('--state')
const state = stateArg < 0 ? path.join(root, '.poc') : process.argv[stateArg + 1]
assert.ok(state && path.isAbsolute(state), '--state must name an absolute POC state directory')
const cfg = JSON.parse(fs.readFileSync(path.join(state, 'config/bitfrost/config.json'), 'utf8'))
const e = JSON.parse(fs.readFileSync(path.join(state, 'run/endpoint.json'), 'utf8'))
const base = `http://127.0.0.1:${e.port}`
const headers = { 'x-bitfrost-poc-token': e.token, 'content-type': 'application/json' }
async function request(method, route, body) {
  const r = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(45000) })
  const d = await r.json()
  assert.equal(r.status, 200, `${method} ${route}: ${JSON.stringify(d)}`)
  return d
}
assert.equal((await fetch(base + '/health')).status, 403)
assert.equal((await fetch(base + '/health', { headers: { ...headers, 'x-bitfrost-poc-token': '0'.repeat(64) } })).status, 403)
assert.equal((await fetch(base + '/health', { headers: { ...headers, Origin: 'https://example.com' } })).status, 403)
const health = await request('GET', '/health')
assert.equal(health.store.degraded, false)
assert.equal(health.configError, null)
const denied = await fetch(base + '/leases', { method: 'POST', headers, body: JSON.stringify({ profile: path.join(state, 'unlisted-profile') }) })
assert.equal(denied.status, 403)
console.log('PASS: authentication, browser-origin rejection, profile restriction, SQLite health')
const { leaseId } = await request('POST', '/leases', { profile: cfg.allowedProfiles[0], host: 'windows-poc-smoke', hostSessionId: 'poc-smoke' })
const renewal = setInterval(() => request('POST', `/leases/${leaseId}`, {}).catch(() => {}), 10000)
let sessionId
try {
  const { agents, hint } = await request('GET', '/agents')
  assert.ok(agents.length, hint || 'No models discovered')
  console.log(`PASS: real Codex App Server discovered ${agents.length} agent types`)
  console.log(JSON.stringify(agents.map(a => ({ name: a.name, model: a.model, defaultEffort: a.defaultEffort }))))
  if (process.argv.includes('--live')) {
    const cwd = path.join(state, 'scratch')
    fs.mkdirSync(cwd, { recursive: true })
    const chosen = agents.find(a => a.model === 'gpt-6.1-sol') || agents[0]
    const s = await request('POST', '/sessions', { leaseId, agent: chosen.name, cwd, prompt: 'This is a connection smoke test. Remember the marker FROST-4827. Reply only POC-READY. Do not use any tools.', developerInstructions: 'This is a synthetic transport test, not a project task. Do not invoke tools, read files, delegate, or change any state. Follow the requested text-only response exactly.', canAskUser: true, autoReview: false, effort: 'low', title: 'BitFrost Windows POC' })
    sessionId = s.id
    let cursor = 0
    async function completed(expectedStatus = 'completed') {
      const deadline = Date.now() + 150000
      while (Date.now() < deadline) {
        const r = await request('GET', `/sessions/${sessionId}/events?after=${cursor}&waitMs=1000`)
        for (const event of r.events) {
          cursor = Math.max(cursor, event.seq)
          if (event.type === 'approval_requested') throw new Error('Unexpected approval in text-only test; no approval was granted')
          if (event.type === 'turn_completed') {
            assert.equal(event.status, expectedStatus, JSON.stringify(event))
            return event.finalText
          }
        }
      }
      throw new Error('Timed out waiting for Codex')
    }
    assert.match(await completed(), /POC-READY/)
    console.log('PASS: live Codex response streamed through BitFrost')
    await request('POST', `/sessions/${sessionId}/input`, { text: 'Reply only with the marker I asked you to remember. Do not use tools.', sender: 'user', clientInputId: 'poc-followup-1' })
    assert.match(await completed(), /FROST-4827/)
    console.log('PASS: follow-up retained session context')
    await request('POST', `/sessions/${sessionId}/input`, { text: 'Count from 1 to 10000, one number per line. No tools.', sender: 'user', clientInputId: 'poc-interrupt-1' })
    await request('POST', `/sessions/${sessionId}/interrupt`, {})
    await completed('interrupted')
    console.log('PASS: active Codex turn interrupted')
    await request('POST', `/sessions/${sessionId}/input`, { text: 'Reply only RESUMED-OK. No tools.', sender: 'user', clientInputId: 'poc-after-interrupt-1' })
    assert.match(await completed(), /RESUMED-OK/)
    console.log('PASS: same session continued after interruption')
  }
} finally {
  if (sessionId) await request('POST', `/sessions/${sessionId}/interrupt`, {}).catch(() => {})
  clearInterval(renewal)
  await request('DELETE', `/leases/${leaseId}`).catch(() => {})
}
