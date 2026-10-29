import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PREFIX_MAP,
  parsePrefixMap,
  expandCompactIri,
  expandValue,
} from './iri.js'

describe('DEFAULT_PREFIX_MAP', () => {
  it('includes ou and fl pack defaults', () => {
    expect(DEFAULT_PREFIX_MAP.ou).toBe('http://example.org/ou/')
    expect(DEFAULT_PREFIX_MAP.fl).toBe('http://example.org/foaf-lite/')
  })
})

describe('parsePrefixMap', () => {
  it('parses Turtle @prefix lines', () => {
    const text = `@prefix ou: <http://example.org/ou/> .
@prefix fl: <http://example.org/foaf-lite/> .
ou:Person a owl:Class .`
    expect(parsePrefixMap(text)).toMatchObject({
      ou: 'http://example.org/ou/',
      fl: 'http://example.org/foaf-lite/',
    })
  })
})

describe('expandCompactIri', () => {
  it('expands ou:Person and fl:alice with defaults', () => {
    expect(expandCompactIri('ou:Person')).toBe('http://example.org/ou/Person')
    expect(expandCompactIri('fl:alice')).toBe(
      'http://example.org/foaf-lite/alice',
    )
  })

  it('leaves Alice, Introduce, and already-expanded IRIs unchanged', () => {
    expect(expandCompactIri('Alice')).toBe('Alice')
    expect(expandCompactIri('Introduce')).toBe('Introduce')
    expect(expandCompactIri('http://example.org/ou/Person')).toBe(
      'http://example.org/ou/Person',
    )
  })

  it('leaves unknown prefix unchanged', () => {
    expect(expandCompactIri('ex:Thing')).toBe('ex:Thing')
  })
})

describe('expandValue', () => {
  it('expands set elements and field values but not keys', () => {
    expect(expandValue(['ou:alice', 'ou:bob'])).toEqual([
      'http://example.org/ou/alice',
      'http://example.org/ou/bob',
    ])
    expect(
      expandValue({ action: 'AssignWorksAt', objectIds: 'ou:alice' }),
    ).toEqual({
      action: 'AssignWorksAt',
      objectIds: 'http://example.org/ou/alice',
    })
  })
})
