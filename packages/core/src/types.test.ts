import { describe, it, expect } from 'vitest'
import { isMethodId } from './types.js'

describe('isMethodId', () => {
  it('accepts M0 and M10', () => {
    expect(isMethodId('M0')).toBe(true)
    expect(isMethodId('M10')).toBe(true)
  })
  it('rejects junk', () => {
    expect(isMethodId('M11')).toBe(false)
  })
})
