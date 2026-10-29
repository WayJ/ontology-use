import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runEval } from './eval.js'
import type { Method, Reasoner, Task } from '@ontology-use/core'

describe('runEval', () => {
  let root: string
  let outDir: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ou-eval-'))
    outDir = join(root, 'out')
    await mkdir(outDir, { recursive: true })

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
    await writeFile(join(mini, 'ontology', 'mini.ttl'), 'ou:alice a ou:Person .\n')
    await writeFile(
      join(mini, 'tasks', 't001-exact.json'),
      JSON.stringify({
        id: 't001',
        type: 'exact',
        question: 'What type is alice?',
        gold: 'http://example.org/ou/Person',
      }),
    )
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('writes latest.json/md and returns ScoreResults', async () => {
    const method: Method = {
      id: 'M0',
      name: 'Fake',
      async run(task: Task) {
        return { value: task.gold as string }
      },
    }
    const reasoner: Reasoner = {
      id: 'mock',
      async complete() {
        return ''
      },
    }

    const results = await runEval({
      packsRoot: root,
      methods: [method],
      reasoner,
      outDir,
    })

    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0]!.methodId).toBe('M0')
    expect(results[0]!.taskId).toBe('t001')
    expect(results[0]!.ok).toBe(true)
    expect(results[0]!.score).toBe(1)

    const json = JSON.parse(await readFile(join(outDir, 'latest.json'), 'utf8'))
    expect(Array.isArray(json)).toBe(true)
    expect(json.length).toBe(results.length)

    const md = await readFile(join(outDir, 'latest.md'), 'utf8')
    expect(md).toContain('M0')
    expect(md).toMatch(/avg|average|score/i)
  })

  it('records method errors and continues', async () => {
    const boom: Method = {
      id: 'M1',
      name: 'Boom',
      async run() {
        throw new Error('boom')
      },
    }
    const ok: Method = {
      id: 'M0',
      name: 'Ok',
      async run(task: Task) {
        return { value: task.gold as string }
      },
    }
    const reasoner: Reasoner = { id: 'mock', async complete() { return '' } }

    const results = await runEval({
      packsRoot: root,
      methods: [boom, ok],
      reasoner,
      outDir,
    })

    const failed = results.find((r) => r.methodId === 'M1')
    const passed = results.find((r) => r.methodId === 'M0')
    expect(failed?.ok).toBe(false)
    expect(failed?.error).toMatch(/boom/)
    expect(passed?.ok).toBe(true)
  })
})
