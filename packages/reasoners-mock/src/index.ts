import { createHash } from 'node:crypto'
import type { Reasoner } from '@ontology-use/core'

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16)
}

export function createMockReasoner(
  fixtures: Record<string, string> = {},
): Reasoner {
  return {
    id: 'mock',
    async complete(prompt: string): Promise<string> {
      if (Object.prototype.hasOwnProperty.call(fixtures, prompt)) {
        return fixtures[prompt]!
      }
      return `MOCK:${hashPrompt(prompt)}`
    },
  }
}
