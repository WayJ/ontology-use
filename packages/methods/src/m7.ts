import type { Method } from '@ontology-use/core'
import { runWithPrompt, schemaSummary, type MethodOpts } from './shared.js'

export function createM7(opts: MethodOpts = {}): Method {
  return {
    id: 'M7',
    name: 'Onto2Tools',
    run: (task, reasoner) =>
      runWithPrompt(task, reasoner, opts, (ontology) => {
        const summary = schemaSummary(ontology)
        const toolNames = summary
          .split(/\s+/)
          .filter((t) => /Person|Class|alice/i.test(t))
          .map((t) => `tool_${t.replace(/[^a-zA-Z0-9]/g, '_')}`)
        const tools = toolNames.length ? toolNames : ['tool_Person']
        return `TOOLS_FROM_ONTOLOGY: ${tools.join(', ')}\nQUESTION:\n${task.question}\n`
      }),
  }
}
