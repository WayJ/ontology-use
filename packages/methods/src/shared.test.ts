import { describe, it, expect } from 'vitest'
import { parseReasonerOutput, stripMarkdownFence } from './shared.js'
import type { Task } from '@ontology-use/core'

function task(partial: Partial<Task> & Pick<Task, 'type' | 'gold'>): Task {
  return {
    id: partial.id ?? 't',
    type: partial.type,
    question: partial.question ?? 'q',
    gold: partial.gold,
  }
}

describe('stripMarkdownFence', () => {
  it('unwraps ```json fences', () => {
    expect(stripMarkdownFence('```json\n["a"]\n```')).toBe('["a"]')
  })
  it('unwraps bare ``` fences', () => {
    expect(stripMarkdownFence('```\nhello\n```')).toBe('hello')
  })
  it('returns trimmed text when no fence', () => {
    expect(stripMarkdownFence('  Alice  ')).toBe('Alice')
  })
})

describe('parseReasonerOutput', () => {
  it('exact: plain string', () => {
    expect(
      parseReasonerOutput('Alice', task({ type: 'exact', gold: 'Alice' })),
    ).toBe('Alice')
  })

  it('exact: unwraps JSON string literal once', () => {
    expect(
      parseReasonerOutput('"Alice"', task({ type: 'exact', gold: 'Alice' })),
    ).toBe('Alice')
  })

  it('exact: does not unwrap JSON objects/arrays into strings', () => {
    expect(
      parseReasonerOutput('{"a":1}', task({ type: 'exact', gold: 'x' })),
    ).toBe('{"a":1}')
    expect(
      parseReasonerOutput('["a"]', task({ type: 'exact', gold: 'x' })),
    ).toBe('["a"]')
  })

  it('exact: fence then JSON string', () => {
    expect(
      parseReasonerOutput('```\n"Bob"\n```', task({ type: 'exact', gold: 'Bob' })),
    ).toBe('Bob')
  })

  it('set: JSON array', () => {
    expect(
      parseReasonerOutput(
        '["http://example.org/ou/alice"]',
        task({ type: 'set', gold: ['http://example.org/ou/alice'] }),
      ),
    ).toEqual(['http://example.org/ou/alice'])
  })

  it('set: fenced JSON array', () => {
    expect(
      parseReasonerOutput(
        '```json\n["ou:alice"]\n```',
        task({ type: 'set', gold: ['ou:alice'] }),
      ),
    ).toEqual(['ou:alice'])
  })

  it('set: non-JSON fallback is one-element array', () => {
    expect(
      parseReasonerOutput('prose', task({ type: 'set', gold: ['a'] })),
    ).toEqual(['prose'])
  })

  it('fields: JSON object', () => {
    expect(
      parseReasonerOutput(
        '{"action":"Introduce","objectIds":"fl:alice"}',
        task({
          type: 'fields',
          gold: { action: 'Introduce', objectIds: 'fl:alice' },
        }),
      ),
    ).toEqual({ action: 'Introduce', objectIds: 'fl:alice' })
  })

  it('fields: non-JSON fallback is { value: trimmed }', () => {
    expect(
      parseReasonerOutput(
        'nope',
        task({ type: 'fields', gold: { action: 'X' } }),
      ),
    ).toEqual({ value: 'nope' })
  })
})
