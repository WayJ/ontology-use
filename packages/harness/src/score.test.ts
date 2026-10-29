import { describe, it, expect } from 'vitest'
import { scoreAnswer } from './score.js'
import type { Task, Answer } from '@ontology-use/core'

function task(partial: Partial<Task> & Pick<Task, 'type' | 'gold'>): Task {
  return {
    id: partial.id ?? 't',
    type: partial.type,
    question: partial.question ?? 'q',
    gold: partial.gold,
    ontologyRefs: partial.ontologyRefs,
  }
}

describe('scoreAnswer', () => {
  it('exact match → 1', () => {
    const t = task({ type: 'exact', gold: 'http://example.org/ou/Person' })
    const a: Answer = { value: 'http://example.org/ou/Person' }
    expect(scoreAnswer(t, a)).toEqual({ ok: true, score: 1 })
  })

  it('exact mismatch → 0', () => {
    const t = task({ type: 'exact', gold: 'a' })
    expect(scoreAnswer(t, { value: 'b' })).toEqual({ ok: false, score: 0 })
  })

  it('exact normalizes whitespace/case', () => {
    const t = task({ type: 'exact', gold: '  Foo  ' })
    expect(scoreAnswer(t, { value: 'foo' })).toEqual({ ok: true, score: 1 })
  })

  it('set F1 = 1 when sets equal', () => {
    const t = task({
      type: 'set',
      gold: ['http://example.org/ou/alice', 'http://example.org/ou/bob'],
    })
    const a: Answer = {
      value: ['http://example.org/ou/bob', 'http://example.org/ou/alice'],
    }
    expect(scoreAnswer(t, a)).toEqual({ ok: true, score: 1 })
  })

  it('set partial F1', () => {
    // gold {a,b}, pred {a} → P=1 R=0.5 F1=2/3
    const t = task({ type: 'set', gold: ['a', 'b'] })
    const r = scoreAnswer(t, { value: ['a'] })
    expect(r.score).toBeCloseTo(2 / 3, 5)
    expect(r.ok).toBe(false)
  })

  it('fields average of exact per field', () => {
    const t = task({
      type: 'fields',
      gold: { action: 'Create', objectIds: 'x' },
    })
    const a: Answer = { value: { action: 'Create', objectIds: 'y' } }
    expect(scoreAnswer(t, a)).toEqual({ ok: false, score: 0.5 })
  })

  it('exact: compact pred vs expanded gold → 1', () => {
    const t = task({ type: 'exact', gold: 'http://example.org/ou/Person' })
    expect(scoreAnswer(t, { value: 'ou:Person' })).toEqual({
      ok: true,
      score: 1,
    })
  })

  it('exact: Alice literal unchanged path still scores 1', () => {
    const t = task({ type: 'exact', gold: 'Alice' })
    expect(scoreAnswer(t, { value: 'Alice' })).toEqual({ ok: true, score: 1 })
  })

  it('set: compact members vs expanded gold → 1', () => {
    const t = task({
      type: 'set',
      gold: [
        'http://example.org/foaf-lite/alice',
        'http://example.org/foaf-lite/bob',
      ],
    })
    expect(
      scoreAnswer(t, { value: ['fl:bob', 'fl:alice'] }),
    ).toEqual({ ok: true, score: 1 })
  })

  it('fields: compact IRI values vs expanded gold → 1', () => {
    const t = task({
      type: 'fields',
      gold: {
        action: 'Introduce',
        objectIds: 'http://example.org/foaf-lite/alice',
      },
    })
    expect(
      scoreAnswer(t, {
        value: { action: 'Introduce', objectIds: 'fl:alice' },
      }),
    ).toEqual({ ok: true, score: 1 })
  })

  it('unknown compact prefix does not falsely match expanded gold', () => {
    const t = task({ type: 'exact', gold: 'http://example.org/ou/Person' })
    expect(scoreAnswer(t, { value: 'ex:Person' })).toEqual({
      ok: false,
      score: 0,
    })
  })
})
