import { describe, it, expect } from 'vitest'
import { createMockReasoner } from './index.js'

describe('createMockReasoner', () => {
  it('is deterministic', async () => {
    const r = createMockReasoner({ 'hello': 'world' })
    expect(await r.complete('hello')).toBe('world')
    expect(await r.complete('hello')).toBe('world')
  })
  it('stable fallback', async () => {
    const r = createMockReasoner()
    const a = await r.complete('x')
    const b = await r.complete('x')
    expect(a).toBe(b)
    expect(a.startsWith('MOCK:')).toBe(true)
  })
})
