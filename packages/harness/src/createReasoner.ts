import type { Reasoner } from '@ontology-use/core'
import { createMockReasoner } from '@ontology-use/reasoners-mock'
import {
  createLlmReasoner,
  LLM_MISSING_KEY_MESSAGE,
} from '@ontology-use/reasoners-llm'

export { LLM_MISSING_KEY_MESSAGE }

/** Build a reasoner for CLI. */
export function createReasoner(kind: string): Reasoner {
  if (kind === 'mock') return createMockReasoner()
  if (kind === 'llm') return createLlmReasoner()
  throw new Error(`Unknown reasoner "${kind}". Use --reasoner=mock (or llm).`)
}

/** Fail fast before runEval so default results/ are not polluted. */
export function assertReasonerRunnable(kind: string): void {
  if (kind === 'mock') return
  if (kind === 'llm') {
    if (!process.env.MINIMAX_API_KEY) {
      throw new Error(LLM_MISSING_KEY_MESSAGE)
    }
    return
  }
  throw new Error(`Unknown reasoner "${kind}". Use --reasoner=mock (or llm).`)
}
