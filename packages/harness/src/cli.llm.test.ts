import { describe, it, expect } from 'vitest'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { LLM_MISSING_KEY_MESSAGE } from '@ontology-use/reasoners-llm'
import { parseArgs } from './cli.js'

const here = dirname(fileURLToPath(import.meta.url))
const cli = resolve(here, 'cli.ts')
const repoRoot = resolve(here, '../../..')

describe('CLI --reasoner=llm', () => {
  it('exits non-zero with missing-key message and writes no results', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'ou-llm-cli-'))
    try {
      const env = { ...process.env, PATH: process.env.PATH }
      delete env.MINIMAX_API_KEY
      const proc = spawnSync(
        'npx',
        ['tsx', cli, '--reasoner=llm', '--out', outDir],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          env,
        },
      )
      expect(proc.status).not.toBe(0)
      const err = `${proc.stderr ?? ''}${proc.stdout ?? ''}`
      expect(err).toContain(LLM_MISSING_KEY_MESSAGE)
      const files = await readdir(outDir)
      expect(files.filter((f) => f.startsWith('latest'))).toHaveLength(0)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  })

  it('parseArgs defaults outDir under results/llm- when reasoner=llm and --out omitted', () => {
    const { outDir, reasonerKind } = parseArgs(['--reasoner=llm'])
    expect(reasonerKind).toBe('llm')
    expect(outDir).toContain(`${join('results', 'llm-')}`)
    // stamp shape: results/llm-YYYYMMDDTHHMMSS
    expect(outDir).toMatch(/results[/\\]llm-\d{8}T\d{6}$/)
  })

  it('parseArgs keeps mock defaults (results/ and results/strict)', () => {
    expect(parseArgs([]).outDir).toBe(resolve(repoRoot, 'results'))
    expect(parseArgs(['--strict-mock']).outDir).toBe(
      resolve(repoRoot, 'results/strict'),
    )
  })

  it('parseArgs respects explicit --out for llm', () => {
    const custom = resolve(repoRoot, 'tmp-llm-out')
    const { outDir } = parseArgs(['--reasoner=llm', '--out', custom])
    expect(outDir).toBe(custom)
  })
})
