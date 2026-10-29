import type { Method } from '@ontology-use/core'
import { runWithPrompt, topKMatchingLines, type MethodOpts } from './shared.js'

export function createM3(opts: MethodOpts = {}): Method {
  return {
    id: 'M3',
    name: 'GraphRAG',
    run: (task, reasoner) =>
      runWithPrompt(task, reasoner, opts, (ontology) => {
        const triples = topKMatchingLines(ontology, task.question, 8)
        return `SUBGRAPH:\n${triples.join('\n')}\n\nQUESTION:\n${task.question}\n`
      }),
  }
}
