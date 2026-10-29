import type { Method } from '@ontology-use/core'
import { runWithPrompt, topKMatchingLines, type MethodOpts } from './shared.js'

export function createM4(opts: MethodOpts = {}): Method {
  return {
    id: 'M4',
    name: 'OG-RAG',
    run: (task, reasoner) =>
      runWithPrompt(task, reasoner, opts, (ontology) => {
        const chunks = topKMatchingLines(ontology, task.question, 5)
        return `ontology-guided:\n${chunks.join('\n')}\n\nQUESTION:\n${task.question}\n`
      }),
  }
}
