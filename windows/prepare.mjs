// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
if (process.platform !== 'win32') throw new Error('This POC setup is Windows-only')
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const state = path.join(root, '.poc')
const profile = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')
const codex = process.argv[2]
if (!codex || !path.isAbsolute(codex) || !fs.statSync(codex).isFile() || !codex.toLowerCase().endsWith('.exe')) throw new Error('Pass the full path to codex.exe')
const target = path.join(state, 'config', 'bitfrost', 'config.json')
if (fs.existsSync(target)) throw new Error('POC already configured; existing configuration was not changed')
fs.mkdirSync(path.dirname(target), { recursive: true })
const providers = Object.fromEntries(['agy','grok','zcode','crush','gemini','omp','opencode'].map(id => [id, { enabled: false }]))
providers.codex = { enabled: true, bin: codex }
fs.writeFileSync(target, JSON.stringify({ allowedProfiles: [profile], providers, handback: { enabled: false }, settingsUpToDate: true }, null, 2) + '\n')
fs.writeFileSync(path.join(root, 'plugins', 'bitfrost', 'windows', 'launch.json'), JSON.stringify({ node: process.execPath, state }, null, 2) + '\n')
console.log('Isolated Windows POC prepared. No plugin was installed or enabled.')
