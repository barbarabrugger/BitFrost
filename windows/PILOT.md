# Windows everyday pilot

This is a small, project-local trial of natural-language delegation from Claude
to a native Codex subagent. It uses the repository root as the workspace.

## Preparation

First prepare the original POC as described in [WINDOWS-POC.md](../WINDOWS-POC.md).
Then pass the full native Claude and Codex executable paths:

```powershell
node windows/prepare-pilot.mjs <absolute-path-to-claude.exe> <absolute-path-to-codex.exe>
node windows/start-pilot.mjs --check
```

Use a Codex executable whose native sandbox works on this machine. The earlier
text-only POC used CLI 0.161.0, but real file operations exposed Windows error 32
while its sandbox setup tried to inspect an in-use runtime file. The already
installed Desktop engine 0.166.0-alpha.5.1 passed the sandbox and file-operation
checks on the test machine. No sandbox disablement, global configuration change,
new binary download or credential copy was needed. This is local compatibility
evidence, not a minimum supported version for other computers.

The launcher tests a harmless echo command with Codex's normal workspace
permission profile and managed requirements, then checks the authenticated
helper and available models. It stops with an error if any check fails. This
does not test remaining quota or the person's eventual UI permission choices.
See [OpenAI's Windows sandbox documentation](https://learn.chatgpt.com/docs/windows/windows-sandbox)
for the sandbox command and troubleshooting context.

Preparation refuses to overwrite an existing local pilot. It copies only
BitFrost into `.claude/skills/bitfrost`, writes project instructions, and creates
separate state under `.poc/pilot/state/`. Other project plugins and the previous
`.poc/desktop` POC are left alone. Changes to source require a deliberate refresh
of the copied plugin; they are not silently installed into running chats.

## Use

Double-click **Start-Windows-Pilot.cmd**. It opens Claude Desktop at this checkout.
The person must handle any workspace-trust prompt and choose **Manual** for the
pilot chat. No program changes those settings. The small terminal window closes
after a successful handoff; on an error it stays open so the message can be read.

Suggested first message:

> Lass Codex (sol6.1) WINDOWS-POC.md lesen und in .poc/pilot/mein-erster-test.md
> drei belegte Fähigkeiten und zwei verbleibende Grenzen auf Deutsch festhalten.
> Er darf dafür lesende Befehle und sein Dateiwerkzeug verwenden. Nur diese neue
> Datei bearbeiten; keine Installationen, Commits oder anderen Projekte.
> Sag mir anschliessend, welcher Codex-Agent gearbeitet hat.

Suggested follow-up:

> Gib demselben Codex-Agenten den Nachtrag: Ergänze in derselben Datei einen
> Abschnitt „Mein nächster Test“ mit einem kleinen praktischen Beispiel. Lass
> den bisherigen Text stehen.

Then ask Claude to inspect the actual file and check both steps. If an approval
appears, the person decides on that specific action. Existing workspace
permissions may allow ordinary edits without a new question; do not interpret
the absence of a prompt as a broken approval system. No answer to a BitFrost
approval defaults to denial. The model must not answer it for the person.

This first trial uses the lead Claude model as well as Codex. Automatic quota
fallback, hard-limit operation, Auto mode and mobile use remain outside this
trial. No upstream issue or pull request is sent by installing or using it.

## Preparation checks completed on 2026-10-31

With the actual Claude Desktop engine (2.1.309) running headlessly, a natural
language request delegated to a native Codex agent. Codex read the project
documentation and created the requested test file with `apply_patch`. A second
Claude invocation resumed the same Codex agent, appended one marker and preserved
the original file. The file was independently checked afterwards. This also
exercised persistent agent restoration across the lead session's disconnect.

An earlier headless file request received a real approval request and defaulted
to denial without a person answering. A positive approval in the Desktop UI is
still a manual acceptance check. The previous Desktop text probe succeeded;
the new launch-button handoff and everyday file workflow await the person's UI
test. Do not treat headless success as completion of that acceptance test.

## Stop / rollback

Close the pilot chat when finished. The helper exits after its final lease expires.
The installed files are local and ignored by Git. To remove the pilot, close its
chats first, then remove only its `.claude/skills/bitfrost` copy and generated
`.claude/CLAUDE.md` after checking for local edits. Keep `.poc/pilot` if its test
files/history are useful. Do not remove other plugins or the earlier test state.
