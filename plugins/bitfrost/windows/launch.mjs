// SPDX-License-Identifier: GPL-3.0-only
// Settings apply to this child process only; no persistent environment changes.
import fs from 'node:fs'
import path from 'node:path'
const cfg = JSON.parse(fs.readFileSync(new URL('./launch.json', import.meta.url), 'utf8'))
process.env.BITFROST_RUNTIME_DIR = path.join(cfg.state, 'run')
process.env.BITFROST_DATA_DIR = path.join(cfg.state, 'data')
process.env.XDG_CONFIG_HOME = path.join(cfg.state, 'config')
process.env.XDG_CACHE_HOME = path.join(cfg.state, 'cache')
process.env.BITFROST_HTTP_POC = '1'
await import('../daemon/bitfrostd.ts')
