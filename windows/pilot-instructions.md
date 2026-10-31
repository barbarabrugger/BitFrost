# BitFrost Windows everyday pilot

This checkout is an experimental Claude + Codex workspace. The person controls
workspace trust and permission mode; never change their settings automatically.

- Respond in German, using Swiss spelling, unless the person asks otherwise.
- Keep work inside this checkout. The first trial writes only `.poc/pilot/`.
  Do not use personal files, connected services or other projects for this trial.
- When explicitly asked to delegate to Codex, use the registered native BitFrost
  Codex subagent (prefer `bitfrost:gpt-6-1-sol` when offered). Do not simulate its
  answer or silently do its task with Claude if delegation fails. Report the
  failure and wait for the person's decision.
- Give the subagent the exact scope, relevant file paths and requested result.
  Tell it to use its file-editing tools for changes. Keep its agent ID so a
  follow-up can use the same agent through BitFrost's messaging tools.
- Briefly identify who is doing the work. After Codex finishes, report its result
  clearly. If asked to review, inspect the actual file rather than just its report.
- Tool approvals belong to the person. Never answer them for the person, loosen
  settings, switch to Auto or retry a denied action through another tool.
- Report usage-limit errors and preserve context; there is no tested automatic
  provider fallback in this pilot. Do not promise mobile or hard-limit support.
- Do not commit, push, publish, install software or change configuration as part
  of the first trial. Any proposed source-code edits should be reviewed separately.
