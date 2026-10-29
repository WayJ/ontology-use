import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadEnabledPacks } from './loadPacks.js'

describe('loadEnabledPacks', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ou-packs-'))
    const mini = join(root, 'packs-public-mini')
    await mkdir(join(mini, 'tasks'), { recursive: true })
    await mkdir(join(mini, 'ontology'), { recursive: true })
    await writeFile(
      join(mini, 'manifest.json'),
      JSON.stringify({
        id: 'public-mini',
        enabled: true,
        title: 'Public mini OWL/RDF pack',
      }),
    )
    await writeFile(
      join(mini, 'ontology', 'mini.ttl'),
      `@prefix ou: <http://example.org/ou/> .\nou:Person a owl:Class .\nou:alice a ou:Person .\n`,
    )
    await writeFile(
      join(mini, 'tasks', 't001-exact.json'),
      JSON.stringify({
        id: 't001',
        type: 'exact',
        question: 'What type is alice?',
        gold: 'http://example.org/ou/Person',
        ontologyRefs: ['ontology/mini.ttl'],
      }),
    )
    await writeFile(
      join(mini, 'tasks', 't002-set.json'),
      JSON.stringify({
        id: 't002',
        type: 'set',
        question: 'List individuals of Person',
        gold: ['http://example.org/ou/alice'],
        ontologyRefs: ['ontology/mini.ttl'],
      }),
    )

    const industrial = join(root, 'packs-industrial-park')
    await mkdir(join(industrial, 'tasks'), { recursive: true })
    await writeFile(
      join(industrial, 'manifest.json'),
      JSON.stringify({
        id: 'industrial-park',
        enabled: false,
        title: 'Industrial park (optional add-on)',
      }),
    )
    await writeFile(
      join(industrial, 'tasks', 'should-skip.json'),
      JSON.stringify({
        id: 'skip-me',
        type: 'exact',
        question: 'ignored',
        gold: 'x',
      }),
    )
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('loads enabled packs with >=2 tasks and skips enabled:false', async () => {
    const packs = await loadEnabledPacks(root)
    expect(packs).toHaveLength(1)
    expect(packs[0]!.packId).toBe('public-mini')
    expect(packs[0]!.tasks.length).toBeGreaterThanOrEqual(2)
    expect(packs[0]!.ontologyPaths.length).toBeGreaterThanOrEqual(1)
    expect(packs.some((p) => p.packId === 'industrial-park')).toBe(false)
  })
})
