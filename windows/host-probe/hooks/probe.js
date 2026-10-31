// SPDX-License-Identifier: GPL-3.0-only
// A diagnostic command, loaded only into the isolated POC host session.
export const register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'bf-poc', description: 'Start one native Codex test subagent (no lead-model request).' })
    return next(e)
  })
  on('command.run', { command: 'bf-poc' }, async ($) => {
    const result = await $.agent.spawn({
      subagentType: 'bitfrost:gpt-6-1-sol',
      description: 'BitFrost Windows connection test',
      prompt: 'This is a connection test. Reply only WINDOWS-NATIVE-POC-OK. Do not use tools.',
    })
    if (result.deny) return { text: `Native agent denied by host: ${result.deny}` }
    await $.clock.sleep(4000)
    const rows = await $.session.messages({ agentId: result.agentId })
    return { text: `Native agent spawn result: ${JSON.stringify(result)}\nTranscript: ${JSON.stringify(rows)}` }
  })
}
