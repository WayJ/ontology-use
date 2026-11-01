import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Answer, Method, Reasoner, ScoreResult } from '@ontology-use/core'
import { loadEnabledPacks } from './loadPacks.js'
import { scoreAnswer } from './score.js'
import { writeResults } from './writeResults.js'

export type RunEvalOpts = {
  packsRoot: string
  methods: Method[]
  reasoner: Reasoner
  outDir: string
  /** Optional run metadata written beside latest.json (never include API keys). */
  runMeta?: Record<string, unknown>
}

function previewAnswer(value: Answer['value']): string {
  const s = JSON.stringify(value)
  if (s.length <= 200) return s
  return `${s.slice(0, 200)}…`
}

function rawLengthFromMeta(meta: Record<string, unknown> | undefined): number | undefined {
  const n = meta?.rawLength
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

export async function runEval(opts: RunEvalOpts): Promise<ScoreResult[]> {
  const packs = await loadEnabledPacks(opts.packsRoot)
  const results: ScoreResult[] = []

  for (const pack of packs) {
    for (const task of pack.tasks) {
      for (const method of opts.methods) {
        try {
          console.error(`[eval] ${method.id} ${task.id}`)
          const answer = await method.run(task, opts.reasoner)
          const { ok, score } = scoreAnswer(task, answer)
          const row: ScoreResult = {
            methodId: method.id,
            taskId: task.id,
            ok,
            score,
            taskType: task.type,
            answerPreview: previewAnswer(answer.value),
            rawLength: rawLengthFromMeta(answer.meta),
          }
          if (task.evidence !== undefined) row.evidence = task.evidence
          if (row.rawLength === undefined) delete row.rawLength
          results.push(row)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const failRow: ScoreResult = {
            methodId: method.id,
            taskId: task.id,
            ok: false,
            score: 0,
            error: message,
            taskType: task.type,
          }
          if (task.evidence !== undefined) failRow.evidence = task.evidence
          results.push(failRow)
        }
      }
    }
  }

  await writeResults(opts.outDir, results)
  if (opts.runMeta) {
    await writeFile(
      join(opts.outDir, 'meta.json'),
      JSON.stringify(opts.runMeta, null, 2) + '\n',
    )
  }
  return results
}
