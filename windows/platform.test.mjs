// SPDX-License-Identifier: GPL-3.0-only
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathLookup, loginShellLookup, resolveBinary } from '../plugins/bitfrost/daemon/config.ts'
test('Windows finds executables in PATH entries containing spaces and ignores directories', { skip: process.platform !== 'win32' }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bitfrost paths '))
  const before = process.env.PATH
  t.after(() => { process.env.PATH = before; fs.rmSync(root, { recursive: true, force: true }) })
  const first = path.join(root, 'first dir'), second = path.join(root, 'second dir')
  fs.mkdirSync(path.join(first, 'poc-bin.exe'), { recursive: true })
  fs.mkdirSync(second)
  const bin = path.join(second, 'poc-bin.exe')
  fs.writeFileSync(bin, 'fixture only; never executed')
  process.env.PATH = [first, second].join(path.delimiter)
  assert.equal(pathLookup('poc-bin'), bin)
  assert.equal(resolveBinary('poc-bin'), bin)
  assert.equal(await loginShellLookup('poc-bin'), bin)
  assert.equal(resolveBinary('definitely-absent-poc-bin'), null)
})
