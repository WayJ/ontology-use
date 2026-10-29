import { describe, it, expect } from 'vitest'
import {
  assertReasonerRunnable,
  createReasoner,
  LLM_PHASE1_MESSAGE,
} from './createReasoner.js'

describe('createReasoner / assertReasonerRunnable', () => {
  it('returns mock reasoner', async () => {
    const r = createReasoner('mock')
    expect(r.id).toBe('mock')
    expect(await r.complete('x')).toMatch(/^MOCK:/)
  })

  it('llm reasoner has id llm (live complete deferred to Task 2 harness wiring)', () => {
    const r = createReasoner('llm')
    expect(r.id).toBe('llm')
  })

  it('assertReasonerRunnable blocks llm before eval', () => {
    expect(() => assertReasonerRunnable('mock')).not.toThrow()
    // Still phase-1 gate until Task 2 switches to MINIMAX_API_KEY check.
    expect(() => assertReasonerRunnable('llm')).toThrow(LLM_PHASE1_MESSAGE)
  })
})
