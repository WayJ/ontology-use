import { describe, it, expect } from 'vitest'
import { createM10 } from './m10.js'
import type { Reasoner, Task } from '@ontology-use/core'

describe('createM10 output contract', () => {
  it('appends OUTPUT CONTRACT on non-shortcut path', async () => {
    let seen = ''
    const reasoner: Reasoner = {
      id: 'llm',
      async complete(p) {
        seen = p
        return '{"action":"Introduce","objectIds":"fl:alice"}'
      },
    }
    const task: Task = {
      id: 'foaf-t003',
      type: 'fields',
      question: 'Introduce alice',
      gold: { action: 'Introduce', objectIds: 'http://example.org/foaf-lite/alice' },
      ontologyRefs: [],
    }
    await createM10().run(task, reasoner)
    expect(seen).toMatch(/OUTPUT CONTRACT/i)
    expect(seen).toContain('action')
  })
})
