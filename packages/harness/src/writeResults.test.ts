import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ScoreResult } from '@ontology-use/core'
import { writeResults } from './writeResults.js'

describe('writeResults type buckets', () => {
  let outDir: string

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'ou-wr-'))
  })

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true })
  })

  it('writes avgExact/avgSet/avgFields; uses em dash when a type has zero rows', async () => {
    const results: ScoreResult[] = [
      { methodId: 'M0', taskId: 'e1', ok: true, score: 1, taskType: 'exact' },
      { methodId: 'M0', taskId: 'e2', ok: true, score: 0.5, taskType: 'exact' },
      { methodId: 'M0', taskId: 's1', ok: true, score: 0.25, taskType: 'set' },
      // no fields rows for M0
      { methodId: 'M1', taskId: 'f1', ok: true, score: 1, taskType: 'fields' },
    ]
    await writeResults(outDir, results)

    const md = await readFile(join(outDir, 'latest.md'), 'utf8')
    expect(md).toContain('avgExact')
    expect(md).toContain('avgSet')
    expect(md).toContain('avgFields')
    // M0 overall (1+0.5+0.25)/3=0.5833; exact 0.75, set 0.25, fields —
    expect(md).toMatch(/\| M0 \| 0\.5833 \| 3 \| 0 \| 0\.7500 \| 0\.2500 \| — \|/)
    // M1: only fields
    expect(md).toMatch(/\| M1 \| 1\.0000 \| 1 \| 0 \| — \| — \| 1\.0000 \|/)

    const summary = JSON.parse(
      await readFile(join(outDir, 'latest.summary.json'), 'utf8'),
    ) as Array<{
      methodId: string
      avgScore: number
      byType: { exact?: number; set?: number; fields?: number }
    }>
    const m0 = summary.find((r) => r.methodId === 'M0')!
    expect(m0.byType.exact).toBeCloseTo(0.75)
    expect(m0.byType.set).toBeCloseTo(0.25)
    expect(m0.byType.fields).toBeUndefined()

    const latest = JSON.parse(await readFile(join(outDir, 'latest.json'), 'utf8'))
    expect(Array.isArray(latest)).toBe(true)
    expect(latest[0].taskType).toBe('exact')
  })

  it('skips missing taskType for buckets but still counts overall avg', async () => {
    const results = [
      {
        methodId: 'M0',
        taskId: 'legacy',
        ok: true,
        score: 1,
      },
      {
        methodId: 'M0',
        taskId: 'e1',
        ok: true,
        score: 0,
        taskType: 'exact',
      },
    ] as ScoreResult[]

    await writeResults(outDir, results)
    const md = await readFile(join(outDir, 'latest.md'), 'utf8')
    // overall avg = (1+0)/2 = 0.5; exact bucket only the typed row → 0.0000; set/fields —
    expect(md).toMatch(/\| M0 \| 0\.5000 \| 2 \| 0 \| 0\.0000 \| — \| — \|/)
  })
})
