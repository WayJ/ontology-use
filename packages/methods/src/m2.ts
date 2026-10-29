import type { Method } from '@ontology-use/core'
import { runWithPrompt, topKMatchingLines, type MethodOpts } from './shared.js'

export function createM2(opts: MethodOpts = {}): Method {
  return {
    id: 'M2',
    name: 'RAGChunks',
    run: (task, reasoner) =>
      runWithPrompt(task, reasoner, opts, (ontology) => {
        const chunks = topKMatchingLines(ontology, task.question, 5)
        return `CHUNKS:\n${chunks.join('\n')}\n\nQUESTION:\n${task.question}\n`
      }),
  }
}
