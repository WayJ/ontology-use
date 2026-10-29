import type { Method } from '@ontology-use/core'
import { runWithPrompt, schemaSummary, type MethodOpts } from './shared.js'

export function createM1(opts: MethodOpts = {}): Method {
  return {
    id: 'M1',
    name: 'SchemaHint',
    run: (task, reasoner) =>
      runWithPrompt(task, reasoner, opts, (ontology) =>
        `SCHEMA:\n${schemaSummary(ontology)}\n\nQUESTION:\n${task.question}\n`,
      ),
  }
}
