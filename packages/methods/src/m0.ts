import type { Method } from '@ontology-use/core'
import { runWithPrompt, type MethodOpts } from './shared.js'

export function createM0(opts: MethodOpts = {}): Method {
  return {
    id: 'M0',
    name: 'PromptDump',
    run: (task, reasoner) =>
      runWithPrompt(task, reasoner, opts, (ontology) =>
        `ONTOLOGY:\n${ontology}\n\nQUESTION:\n${task.question}\n`,
      ),
  }
}
