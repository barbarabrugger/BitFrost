// SPDX-License-Identifier: GPL-3.0-only
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'

test('pilot installation isolates state, bundles metadata and refuses to overwrite local edits', { skip: process.platform !== 'win32' }, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bitfrost pilot '))
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep))
    fs.rmSync(root, { recursive: true, force: true })
  })
  const put = (name, data) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data) }
  put('windows/prepare-pilot.mjs', fs.readFileSync(new URL('./prepare-pilot.mjs', import.meta.url)))
  put('windows/pilot-instructions.md', 'Generated instructions\n')
  put('plugins/bitfrost/windows/launch.json', JSON.stringify({ node: process.execPath, state: path.join(root, '.poc') }))
  put('package.json', '{"type":"module","dbVersion":8}')
  put('.poc/config/bitfrost/config.json', JSON.stringify({ allowedProfiles: ['fixture-profile'], providers: { codex: { enabled: true, bin: 'old.exe' }, gemini: { enabled: false } }, handback: { enabled: false } }))
  const prepare = () => spawnSync(process.execPath, [path.join(root, 'windows/prepare-pilot.mjs'), process.execPath, process.execPath], { encoding: 'utf8', windowsHide: true })
  const first = prepare()
  assert.equal(first.status, 0, first.stderr)
  const json = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'))
  const launch = json('.poc/pilot/launch.json')
  assert.equal(launch.state, path.join(root, '.poc/pilot/state'))
  assert.equal(json('.claude/skills/bitfrost/windows/launch.json').state, launch.state)
  assert.equal(json('.claude/skills/bitfrost/package.json').dbVersion, 8)
  const config = json('.poc/pilot/state/config/bitfrost/config.json')
  assert.equal(config.providers.codex.bin, process.execPath)
  assert.equal(config.providers.gemini.enabled, false)
  assert.equal(json('.poc/config/bitfrost/config.json').providers.codex.bin, 'old.exe')
  put('.claude/CLAUDE.md', 'Local user changes\n')
  assert.notEqual(prepare().status, 0)
  assert.equal(fs.readFileSync(path.join(root, '.claude/CLAUDE.md'), 'utf8'), 'Local user changes\n')
})
