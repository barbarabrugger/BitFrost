# Native Windows POC — Codex only

Experimental work based on upstream BitFrost commit
[`64eb0000`](https://github.com/SavaSoftworks/BitFrost/commit/64eb0000d81dc59416412b9637c736da77f466cf)
(0.9.3). This branch is a feasibility experiment, not a supported Windows release.
The upstream GPL-3.0-only license and copyright notices are preserved.

For the project-local everyday trial, see [windows/PILOT.md](windows/PILOT.md).
It adds a launch button, a real sandbox preflight and natural-language file tasks.

## Scope

Run the existing TypeScript helper and Codex App Server on Windows, keeping
BitFrost's native Claude subagent event replay, permissions and persistence.
The POC does not patch Claude Desktop or copy provider credentials.

Windows-specific changes cover executable discovery, PATH delimiters, a Node
launcher, file-URL handling and a local authenticated HTTP transport. Other
providers are disabled in the generated POC configuration. Existing user plugins
and settings are not overwritten. Runtime files and machine paths are ignored by Git.

## Prepare

Requirements: Windows x64, Node 24, an installed and authenticated native Codex CLI,
and a Claude Code version supporting mods. Initial checks used Node 24.22.1,
Codex CLI 0.161.0, Claude CLI 2.1.292 and Claude Desktop 4.4212.0.

From PowerShell at the repository root:

```powershell
node windows/prepare.mjs (Get-Command codex.exe).Source
node plugins/bitfrost/windows/launch.mjs ensure
node windows/smoke.mjs
```

`prepare` refuses to overwrite an existing POC config. State is kept under `.poc/`.
It does not register a global plugin, install a service or configure autostart.

`node windows/smoke.mjs --live` uses the existing Codex subscription for a few
synthetic text requests. It checks the first response, contextual follow-up,
interruption and continuation after interruption. No provider keys are read by
the test or copied into its configuration. The coding app owns authentication.

## Claude host and Desktop probe

```powershell
claude --plugin-dir ./plugins/bitfrost --plugin-dir ./windows/host-probe --strict-mcp-config --mcp-config '{"mcpServers":{}}' --setting-sources '' --system-prompt 'Connection test only. No tools or external actions.' -p '/bf-poc' --output-format json
```

This loads both plugins for this CLI session only. `/bf-poc` explicitly starts one
Codex subagent without asking the lead Claude model to delegate. It waits briefly
and prints the available subagent transcript; a slow response can arrive later.
The diagnostic currently targets `gpt-6.1-sol`, which must be available on the
Codex account. Other discovered Codex models can be delegated through BitFrost.

For a project-local Desktop experiment:

```powershell
node windows/prepare-desktop.mjs
Push-Location .poc/desktop
claude --desktop
Pop-Location
```

Run `claude --desktop` in a real terminal; it refuses redirected output. The
person using the app must trust the test workspace. Run `/bf-poc` in that new
session. The Desktop preparation copies plugins into that project's
`.claude/skills/`; rerun it after changing source files and start a fresh session
to ensure the copied modules are reloaded.

The first Desktop copy lacked the root package's schema metadata. Preparation
now bundles `package.json`, following upstream's release layout. `/reload-plugins`
and `/clear` did not re-run the failed initialization in the already-open test
chat. Forking that synthetic chat created a fresh engine, preserved its manually
chosen permission mode and completed the test. Do not change another chat's
permission mode for this experiment.

Observed limitation: Desktop's Auto mode denied the direct `agent.spawn` call
because no server-side classifier verdict existed, including one unchanged retry.
The person can choose Manual mode in the isolated test chat; the POC never
changes permission mode or bypasses a host denial automatically.

## Verification

Run deterministic tests without provider credentials or model calls:

```powershell
node --test --disable-warning=ExperimentalWarning plugins/bitfrost/daemon/test/codex.spec.ts windows/platform.test.mjs windows/poc-transport.test.mjs
claude plugin test plugins/bitfrost
claude plugin validate plugins/bitfrost
```

Verified locally on 2026-10-31:

- All 27 existing Codex adapter tests passed with the Windows process launcher.
- Both new platform/transport tests passed (29 Node tests total).
- All 48 Claude hook tests passed, using a simulated helper.
- The local transport rejected missing/invalid tokens, browser Origin headers
  and unexpected Host headers; it binds only to `127.0.0.1` on a random port.
- A real Codex App Server discovered eight models and completed text, context,
  interruption and continuation checks through the modified BitFrost helper.
- A real Claude CLI host spawned and completed a native Codex subagent. Its
  transcript contained `WINDOWS-NATIVE-POC-OK`; the lead Claude usage was zero.
- The same probe completed from the Claude Desktop UI in Manual mode, with a
  native `bitfrost:gpt-6-1-sol` agent and the expected response in its transcript.

Mock tests are not evidence of end-to-end Desktop permission dialogs. A zero-use
Claude CLI run is not proof that Desktop remains usable at a hard account limit.
The observed five-hour limit reset before the Desktop tests.
The complete upstream `npm run check` suite was not run: it also requires the
native TUI and COBOL migration toolchain, which are outside this Windows POC.

## Deliberate limits

- Fresh POC database only. The COBOL migration executable, installer and update
  path have not been ported; do not connect this branch to an existing BitFrost DB.
- No Windows TUI, multi-provider compatibility, mobile verification or separate
  nested sidebar sessions are claimed.
- The per-start local transport token is stored under `.poc/run/`. Its protection
  relies on the current user's filesystem ACLs; do not place this checkout in a
  shared writable directory. No token is printed or committed.
- Full process-tree cleanup and real file-operation approval UI still need
  dedicated end-to-end validation. Preserve host permission prompts.
- If launching inside a restricted automation sandbox, hard-link creation used
  by upstream's daemon lock can be denied. This does not justify replacing or
  disabling the lock; use an authorised normal user process for the experiment.

## Potential upstream contribution

Keep small portability fixes separate from the experimental transport and probe.
Start with executable discovery, PATH handling and Windows test-fixture launching.
Discuss the intended IPC transport and supported provider scope with the maintainer
before proposing broader support, as requested in CONTRIBUTING.md. A Windows CI
workflow for the credential-free Codex/platform/transport tests is included. Its
first GitHub run passed on `windows-latest`, including the standalone Desktop
packaging check, on 2026-10-31.

No upstream issue or pull request has been submitted by this experiment.
