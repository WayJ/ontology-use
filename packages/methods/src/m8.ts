import type { Method } from '@ontology-use/core'
import { runWithPrompt, type MethodOpts } from './shared.js'

const SYNONYMS: Record<string, string> = {
  person: 'Person',
  people: 'Person',
  human: 'Person',
}

export function createM8(opts: MethodOpts = {}): Method {
  return {
    id: 'M8',
    name: 'TaxonomyEnrich',
    run: (task, reasoner) =>
      runWithPrompt(task, reasoner, opts, () => {
        const q = task.question.toLowerCase()
        const mapped = Object.entries(SYNONYMS)
          .filter(([k]) => q.includes(k))
          .map(([k, v]) => `${k}->${v}`)
          .join(', ')
        return `TAXONOMY_ALIGN: ${mapped || 'none'}\nQUESTION:\n${task.question}\n`
      }),
  }
}
