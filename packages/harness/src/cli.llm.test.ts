import { describe, it, expect } from 'vitest'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { LLM_PHASE1_MESSAGE } from '@ontology-use/reasoners-llm'

const here = dirname(fileURLToPath(import.meta.url))
const cli = resolve(here, 'cli.ts')

describe('CLI --reasoner=llm', () => {
  it('exits non-zero with clear message and writes no results', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'ou-llm-cli-'))
    try {
      const proc = spawnSync(
        'npx',
        ['tsx', cli, '--reasoner=llm', '--out', outDir],
        {
          cwd: resolve(here, '../../..'),
          encoding: 'utf8',
          env: { ...process.env, PATH: process.env.PATH },
        },
      )
      expect(proc.status).not.toBe(0)
      const err = `${proc.stderr ?? ''}${proc.stdout ?? ''}`
      expect(err).toContain(LLM_PHASE1_MESSAGE)
      const files = await readdir(outDir)
      expect(files.filter((f) => f.startsWith('latest'))).toHaveLength(0)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  })
})
