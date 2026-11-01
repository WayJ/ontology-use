import { describe, it, expect } from 'vitest'
import { isMethodId } from './types.js'
import type { ScoreResult, Task } from './types.js'

describe('isMethodId', () => {
  it('accepts M0 and M10', () => {
    expect(isMethodId('M0')).toBe(true)
    expect(isMethodId('M10')).toBe(true)
  })
  it('rejects junk', () => {
    expect(isMethodId('M11')).toBe(false)
  })
})

describe('Task / ScoreResult evidence + taskType shapes', () => {
  it('allows Task without evidence and with string or string[] evidence', () => {
    const base: Task = {
      id: 't1',
      type: 'exact',
      question: 'q',
      gold: 'g',
    }
    const withStr: Task = { ...base, evidence: 'doc#p1' }
    const withArr: Task = { ...base, evidence: ['doc#p1', 'doc#p2'] }
    expect(withStr.evidence).toBe('doc#p1')
    expect(withArr.evidence).toEqual(['doc#p1', 'doc#p2'])
  })

  it('requires ScoreResult.taskType and optional evidence echo', () => {
    const row: ScoreResult = {
      methodId: 'M0',
      taskId: 't1',
      ok: true,
      score: 1,
      taskType: 'exact',
      evidence: 'doc#p1',
    }
    expect(row.taskType).toBe('exact')
    expect(row.evidence).toBe('doc#p1')
  })
})
