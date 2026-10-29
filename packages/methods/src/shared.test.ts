import { describe, it, expect } from 'vitest'
import {
  parseReasonerOutput,
  stripMarkdownFence,
  outputContractFooter,
  runWithPrompt,
  shouldShortcut,
} from './shared.js'
import type { Reasoner, Task } from '@ontology-use/core'

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

describe('outputContractFooter', () => {
  it('exact asks for a single plain string', () => {
    const f = outputContractFooter(task({ type: 'exact', gold: 'Alice' }))
    expect(f).toMatch(/single plain string/i)
    expect(f).toMatch(/No JSON/i)
  })

  it('set asks for a JSON array of strings', () => {
    const f = outputContractFooter(
      task({ type: 'set', gold: ['http://example.org/ou/alice'] }),
    )
    expect(f).toMatch(/JSON array of strings/i)
  })

  it('fields lists gold keys', () => {
    const f = outputContractFooter(
      task({
        type: 'fields',
        gold: { action: 'Introduce', objectIds: 'x' },
      }),
    )
    expect(f).toMatch(/JSON object/i)
    expect(f).toContain('action')
    expect(f).toContain('objectIds')
  })
})

describe('runWithPrompt contract wiring', () => {
  it('appends footer for live reasoner and keeps mock shortcut gold without footer', async () => {
    let seenPrompt = ''
    const llm: Reasoner = {
      id: 'llm',
      async complete(prompt) {
        seenPrompt = prompt
        return 'Alice'
      },
    }
    const t = task({ type: 'exact', gold: 'Alice' })
    await runWithPrompt(t, llm, {}, () => 'BASE_PROMPT')
    expect(seenPrompt.startsWith('BASE_PROMPT')).toBe(true)
    expect(seenPrompt).toMatch(/OUTPUT CONTRACT/i)
    expect(seenPrompt).toMatch(/single plain string/i)

    const mock: Reasoner = {
      id: 'mock',
      async complete() {
        throw new Error('should not be called')
      },
    }
    const ans = await runWithPrompt(t, mock, {}, () => 'BASE_PROMPT')
    expect(ans.value).toBe('Alice')
    expect(ans.meta?.strategy).toBe('mock-shortcut')
    expect(shouldShortcut(mock, {})).toBe(true)
  })

  it('stashes rawLength on reasoner answers', async () => {
    const llm: Reasoner = {
      id: 'llm',
      async complete() {
        return 'Alice'
      },
    }
    const ans = await runWithPrompt(
      task({ type: 'exact', gold: 'Alice' }),
      llm,
      {},
      () => 'P',
    )
    expect(ans.meta?.rawLength).toBe(5)
  })
})
