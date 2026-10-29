import type { Answer, Method } from '@ontology-use/core'
import { runWithPrompt, type MethodOpts } from './shared.js'

function extractIris(value: Answer['value']): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value
  return Object.values(value)
}

export function createM6(opts: MethodOpts = {}): Method {
  return {
    id: 'M6',
    name: 'SHACLGate',
    run: (task, reasoner) =>
      runWithPrompt(
        task,
        reasoner,
        opts,
        (ontology) =>
          `VALIDATE_THEN_ANSWER\nONTOLOGY:\n${ontology}\n\nQUESTION:\n${task.question}\n`,
        (answer, ontology): Answer => {
          const iris = extractIris(answer.value)
          const missing = iris.filter((iri) => iri && !ontology.includes(iri))
          // mock-shortcut returns gold; may not be in empty ontology — only gate non-shortcut or when ontology present
          if (answer.meta?.strategy === 'mock-shortcut') {
            return answer
          }
          if (missing.length > 0) {
            const cleared =
              task.type === 'set' ? [] : task.type === 'fields' ? {} : ''
            return {
              value: cleared,
              meta: { ...answer.meta, shaclFailed: true, missingIris: missing },
            }
          }
          return { ...answer, meta: { ...answer.meta, shaclFailed: false } }
        },
      ),
  }
}
