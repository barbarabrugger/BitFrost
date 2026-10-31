// SPDX-License-Identifier: GPL-3.0-only
// Project-local copies only. Does not modify the user's installed plugins.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const project = path.join(root, '.poc', 'desktop')
const skills = path.join(project, '.claude', 'skills')
for (const [source, name] of [[path.join(root, 'plugins/bitfrost'), 'bitfrost'], [path.join(root, 'windows/host-probe'), 'bitfrost-poc-probe']]) {
  fs.cpSync(source, path.join(skills, name), { recursive: true, filter: p => !p.includes(`${path.sep}types`) && !p.includes(`${path.sep}test${path.sep}`) && !p.endsWith('.test.ts') })
}
// Like upstream release packaging, standalone copies need the DB schema version.
fs.copyFileSync(path.join(root, 'package.json'), path.join(skills, 'bitfrost', 'package.json'))
fs.writeFileSync(path.join(project, 'CLAUDE.md'), '# Isolated BitFrost test project\n\nThis folder contains synthetic connection tests only. Do not access personal files, other projects, connectors or external services except the existing coding-agent subscription. Do not change user settings.\n')
console.log('Prepared project-local plugins under .poc/desktop. Open this directory with claude --desktop.')
