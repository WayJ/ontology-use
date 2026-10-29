import { describe, it, expect, afterEach } from 'vitest'
import {
  assertReasonerRunnable,
  createReasoner,
} from './createReasoner.js'
import { LLM_MISSING_KEY_MESSAGE } from '@ontology-use/reasoners-llm'

describe('createReasoner / assertReasonerRunnable', () => {
  const prevKey = process.env.MINIMAX_API_KEY

  afterEach(() => {
    if (prevKey === undefined) delete process.env.MINIMAX_API_KEY
    else process.env.MINIMAX_API_KEY = prevKey
  })

  it('returns mock reasoner', async () => {
    const r = createReasoner('mock')
    expect(r.id).toBe('mock')
    expect(await r.complete('x')).toMatch(/^MOCK:/)
  })

  it('createReasoner llm returns id llm when key set', () => {
    process.env.MINIMAX_API_KEY = 'test-key-not-real'
    const r = createReasoner('llm')
    expect(r.id).toBe('llm')
  })

  it('assertReasonerRunnable allows mock always', () => {
    delete process.env.MINIMAX_API_KEY
    expect(() => assertReasonerRunnable('mock')).not.toThrow()
  })

  it('assertReasonerRunnable throws LLM_MISSING_KEY_MESSAGE when key unset', () => {
    delete process.env.MINIMAX_API_KEY
    expect(() => assertReasonerRunnable('llm')).toThrow(LLM_MISSING_KEY_MESSAGE)
  })

  it('assertReasonerRunnable throws when key is empty string', () => {
    process.env.MINIMAX_API_KEY = ''
    expect(() => assertReasonerRunnable('llm')).toThrow(LLM_MISSING_KEY_MESSAGE)
  })

  it('assertReasonerRunnable allows llm when MINIMAX_API_KEY set', () => {
    process.env.MINIMAX_API_KEY = 'test-key-not-real'
    expect(() => assertReasonerRunnable('llm')).not.toThrow()
  })
})
