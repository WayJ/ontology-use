import type { Reasoner } from '@ontology-use/core'
import { createMockReasoner } from '@ontology-use/reasoners-mock'
import {
  createLlmReasoner,
  LLM_PHASE1_MESSAGE,
} from '@ontology-use/reasoners-llm'

export { LLM_PHASE1_MESSAGE }

/**
 * Build a reasoner for CLI. For `llm`, returns the stub that throws on complete;
 * callers must refuse to run eval in phase 1 (see assertReasonerRunnable).
 */
export function createReasoner(kind: string): Reasoner {
  if (kind === 'mock') return createMockReasoner()
  if (kind === 'llm') return createLlmReasoner()
  throw new Error(`Unknown reasoner "${kind}". Use --reasoner=mock (or llm).`)
}

/** Fail fast before runEval so default results/ are not polluted. */
export function assertReasonerRunnable(kind: string): void {
  if (kind === 'mock') return
  if (kind === 'llm') {
    throw new Error(LLM_PHASE1_MESSAGE)
  }
  throw new Error(`Unknown reasoner "${kind}". Use --reasoner=mock (or llm).`)
}
