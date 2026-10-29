import type { Answer, Method } from '@ontology-use/core'
import {
  goldShapedValue,
  outputContractFooter,
  parseReasonerOutput,
  readOntologyText,
  shouldShortcut,
  type MethodOpts,
} from './shared.js'

function asActionFields(value: Answer['value']): Record<string, string> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, string>
    return {
      action: rec.action ?? 'Answer',
      objectIds: rec.objectIds ?? JSON.stringify(rec),
    }
  }
  if (Array.isArray(value)) {
    return { action: 'Answer', objectIds: value.join(',') }
  }
  return { action: 'Answer', objectIds: String(value) }
}

export function createM10(opts: MethodOpts = {}): Method {
  return {
    id: 'M10',
    name: 'ActionSDK',
    async run(task, reasoner) {
      const ontology = await readOntologyText(task)
      if (shouldShortcut(reasoner, opts)) {
        const value = goldShapedValue(task)
        return {
          value,
          meta: {
            strategy: 'mock-shortcut',
            actionEnvelope: asActionFields(value),
          },
        }
      }
      const prompt =
        `ACTION_SDK\nONTOLOGY:\n${ontology}\n\nQUESTION:\n${task.question}\n` +
        outputContractFooter(task)
      const raw = await reasoner.complete(prompt)
      const parsed = parseReasonerOutput(raw, task)
      return {
        value: parsed,
        meta: {
          strategy: 'reasoner',
          prompt,
          rawLength: raw.length,
          actionEnvelope: asActionFields(parsed),
        },
      }
    },
  }
}
