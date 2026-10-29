import { describe, it, expect } from 'vitest'
import { createLlmReasoner, LLM_PHASE1_MESSAGE } from './index.js'

describe('createLlmReasoner', () => {
  it('throws clear phase-1 error on complete', async () => {
    const r = createLlmReasoner()
    expect(r.id).toBe('llm')
    await expect(r.complete('hello')).rejects.toThrow(LLM_PHASE1_MESSAGE)
    await expect(r.complete('hello')).rejects.toThrow(
      'LLM reasoner not implemented in phase 1; set fixtures or use mock',
    )
  })
})
