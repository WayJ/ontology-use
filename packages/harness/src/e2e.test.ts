import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockReasoner } from '@ontology-use/reasoners-mock'
import { allMethods } from '@ontology-use/methods'
import { loadEnabledPacks } from './loadPacks.js'
import { runEval } from './eval.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const packsRoot = resolve(repoRoot, 'packages')

describe('e2e mock eval', () => {
  let outDir: string

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'ou-e2e-'))
  })

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true })
  })

  it('loads three public packs; results for all 11 methods; ≥16 tasks', async () => {
    const packs = await loadEnabledPacks(packsRoot)
    const packIds = packs.map((p) => p.packId).sort()
    expect(packIds).toContain('public-mini')
    expect(packIds).toContain('public-foaf-lite')
    expect(packIds).toContain('public-org-lite')
    expect(packs.some((p) => p.packId === 'industrial-park')).toBe(false)

    const taskCount = packs.reduce((n, p) => n + p.tasks.length, 0)
    expect(taskCount).toBeGreaterThanOrEqual(16)

    const methods = allMethods({ strictMock: false })
    expect(methods).toHaveLength(11)

    const results = await runEval({
      packsRoot,
      methods,
      reasoner: createMockReasoner(),
      outDir,
    })

    expect(results.length).toBe(methods.length * taskCount)

    const methodIds = [...new Set(results.map((r) => r.methodId))].sort(
      (a, b) => a.localeCompare(b, undefined, { numeric: true }),
    )
    expect(methodIds).toEqual([
      'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10',
    ])

    const md = await readFile(join(outDir, 'latest.md'), 'utf8')
    for (const id of methodIds) {
      expect(md).toContain(`| ${id} |`)
    }
    expect(md).toContain('avgExact')
    expect(md).toContain('avgSet')
    expect(md).toContain('avgFields')
    JSON.parse(await readFile(join(outDir, 'latest.json'), 'utf8'))
  })
})
