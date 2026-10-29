import type { Reasoner } from '@ontology-use/core'

export const LLM_PHASE1_MESSAGE =
  'LLM reasoner not implemented in phase 1; set fixtures or use mock'

export function createLlmReasoner(): Reasoner {
  return {
    id: 'llm',
    async complete(_prompt: string): Promise<string> {
      throw new Error(LLM_PHASE1_MESSAGE)
    },
  }
}
