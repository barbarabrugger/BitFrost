// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
function runNode(file, args = [], timeout = 60000) {
  const r = spawnSync(process.execPath, [path.join(root, file), ...args], {
    cwd: root, encoding: 'utf8', timeout, windowsHide: true,
  })
  if (r.error || r.status !== 0) throw new Error(`${file}: ${r.error?.message || r.stderr || r.stdout || 'Start failed'}`)
  return r.stdout
}
try {
  const configFile = path.join(root, '.poc/pilot/launch.json')
  if (!fs.existsSync(configFile)) throw new Error('Pilot noch nicht eingerichtet. Zuerst windows/prepare-pilot.mjs ausfuehren.')
  const { claude, codex, state } = JSON.parse(fs.readFileSync(configFile, 'utf8'))
  if (!path.isAbsolute(claude) || !claude.toLowerCase().endsWith('.exe') || !fs.statSync(claude).isFile()) throw new Error('Claude CLI wurde verschoben. Den lokalen Pilot-Startpfad aktualisieren lassen.')
  if (!codex || !path.isAbsolute(codex) || !fs.existsSync(codex) || !fs.statSync(codex).isFile()) throw new Error('Die konfigurierte Codex-Engine fehlt. Den Pilot nach dem App-Update neu verbinden lassen.')
  if (!state || !path.isAbsolute(state)) throw new Error('Lokales Pilot-Verzeichnis fehlt in der Startkonfiguration.')
  if (!fs.existsSync(path.join(root, '.claude/skills/bitfrost/package.json'))) throw new Error('Projekt-Plugin fehlt oder ist unvollstaendig. Pilot-Einrichtung pruefen lassen.')
  console.log('Pruefe einen harmlosen Befehl in der normalen Codex-Sandbox ...')
  const sandbox = spawnSync(codex, ['sandbox', '--include-managed-config', '--permission-profile', ':workspace', '--cd', root, '--', path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/cmd.exe'), '/d', '/c', 'echo BITFROST_SANDBOX_OK'], {
    cwd: root, encoding: 'utf8', timeout: 60000, windowsHide: true,
  })
  if (sandbox.error || sandbox.status !== 0 || !sandbox.stdout?.includes('BITFROST_SANDBOX_OK')) throw new Error(`Codex-Sandbox nicht bereit. ${sandbox.error?.message || sandbox.stderr || sandbox.stdout || 'Start fehlgeschlagen.'}`)
  console.log('BitFrost-Pilot: pruefe lokale Verbindung und Codex-Modelle ...')
  runNode('.claude/skills/bitfrost/windows/launch.mjs', ['ensure'], 30000)
  runNode('windows/smoke.mjs', ['--state', state]) // Metadata/authentication checks; no model request.
  console.log('Bereit: BitFrost erreichbar, Codex-Modelle verfuegbar.')
  if (!process.argv.includes('--check')) {
    console.log('Oeffne den BitFrost-Projektordner in Claude Desktop. Waehle dort fuer den Pilot Manuell.')
    const result = spawnSync(claude, ['--desktop'], { cwd: root, stdio: 'inherit', windowsHide: true })
    if (result.error || result.status !== 0) throw new Error(result.error?.message || 'Claude Desktop konnte nicht geoeffnet werden. Diesen Startknopf per Doppelklick in einem normalen Windows-Fenster starten.')
  }
} catch (error) {
  console.error(`Pilot nicht gestartet: ${error.message}`)
  console.error('Der Start aendert keine Freigabeeinstellungen. Bitte diese Fehlermeldung weitergeben.')
  process.exitCode = 1
}
