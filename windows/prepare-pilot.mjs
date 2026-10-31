// SPDX-License-Identifier: GPL-3.0-only
// Install only into this checkout. Never change global plugins or permissions.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const cli = process.argv[2]
const codex = process.argv[3]
if (process.platform !== 'win32') throw new Error('The pilot requires Windows')
if (!cli || !path.isAbsolute(cli) || !cli.toLowerCase().endsWith('.exe') || !fs.statSync(cli).isFile()) throw new Error('Pass the full path to claude.exe')
if (!codex || !path.isAbsolute(codex) || !codex.toLowerCase().endsWith('.exe') || !fs.statSync(codex).isFile()) throw new Error('Pass a sandbox-tested codex.exe path as the second argument')
const launch = path.join(root, 'plugins/bitfrost/windows/launch.json')
if (!fs.existsSync(launch)) throw new Error('Prepare the Windows POC first with windows/prepare.mjs')
const target = path.join(root, '.claude/skills/bitfrost')
const instructions = path.join(root, '.claude/CLAUDE.md')
const pilot = path.join(root, '.poc/pilot')
const state = path.join(pilot, 'state')
const config = JSON.parse(fs.readFileSync(path.join(root, '.poc/config/bitfrost/config.json'), 'utf8'))
config.providers.codex.bin = codex
// Refuse to replace either user edits or a previously prepared pilot.
for (const file of [target, instructions, path.join(pilot, 'launch.json'), path.join(state, 'config/bitfrost/config.json')]) {
  if (fs.existsSync(file)) throw new Error('Pilot files already exist. Use Start-Windows-Pilot.cmd; preparation does not overwrite them.')
}
fs.mkdirSync(pilot, { recursive: true })
fs.cpSync(path.join(root, 'plugins/bitfrost'), target, { recursive: true,
  filter: p => !p.includes(`${path.sep}types`) && !p.includes(`${path.sep}test${path.sep}`) && !p.endsWith('.test.ts') })
fs.copyFileSync(path.join(root, 'package.json'), path.join(target, 'package.json'))
fs.copyFileSync(path.join(root, 'windows/pilot-instructions.md'), instructions)
fs.mkdirSync(path.join(state, 'config/bitfrost'), { recursive: true })
fs.writeFileSync(path.join(state, 'config/bitfrost/config.json'), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' })
fs.writeFileSync(path.join(target, 'windows/launch.json'), JSON.stringify({ node: process.execPath, state }, null, 2) + '\n')
fs.writeFileSync(path.join(pilot, 'launch.json'), JSON.stringify({ claude: cli, codex, state }, null, 2) + '\n', { flag: 'wx' })
console.log('Pilot prepared in this repository. Open Start-Windows-Pilot.cmd to begin.')
