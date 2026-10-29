import { describe, it, expect } from 'vitest'
import { allMethods } from './registry.js'
import { createMockReasoner } from '@ontology-use/reasoners-mock'
import type { Task } from '@ontology-use/core'

const baseTask: Task = {
  id: 't001',
  type: 'exact',
  question: 'What OWL class is http://example.org/ou/alice an instance of?',
  gold: 'http://example.org/ou/Person',
  ontologyRefs: [],
}

describe('allMethods', () => {
  it('returns 11 unique M0–M10 ids', () => {
    const methods = allMethods()
    expect(methods).toHaveLength(11)
    const ids = methods.map((m) => m.id)
    expect(ids).toEqual([
      'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10',
    ])
    expect(new Set(ids).size).toBe(11)
  })

  it('each method returns an Answer for fixed task+mock (shortcut)', async () => {
    const reasoner = createMockReasoner()
    for (const method of allMethods({ strictMock: false })) {
      const answer = await method.run(baseTask, reasoner)
      expect(answer).toBeDefined()
      expect(answer.value).toBeDefined()
      expect(answer.meta?.strategy).toBe('mock-shortcut')
    }
  })

  it('strictMock skips shortcut and calls reasoner', async () => {
    const reasoner = createMockReasoner({
      // prompts vary; fallback MOCK:hash is fine
    })
    const [m0] = allMethods({ strictMock: true })
    const answer = await m0!.run(baseTask, reasoner)
    expect(answer.meta?.strategy).not.toBe('mock-shortcut')
    expect(typeof answer.value === 'string' || Array.isArray(answer.value) || typeof answer.value === 'object').toBe(true)
  })
})
