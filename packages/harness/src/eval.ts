import type { Method, Reasoner, ScoreResult } from '@ontology-use/core'
import { loadEnabledPacks } from './loadPacks.js'
import { scoreAnswer } from './score.js'
import { writeResults } from './writeResults.js'

export type RunEvalOpts = {
  packsRoot: string
  methods: Method[]
  reasoner: Reasoner
  outDir: string
}

export async function runEval(opts: RunEvalOpts): Promise<ScoreResult[]> {
  const packs = await loadEnabledPacks(opts.packsRoot)
  const results: ScoreResult[] = []

  for (const pack of packs) {
    for (const task of pack.tasks) {
      for (const method of opts.methods) {
        try {
          const answer = await method.run(task, opts.reasoner)
          const { ok, score } = scoreAnswer(task, answer)
          results.push({
            methodId: method.id,
            taskId: task.id,
            ok,
            score,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          results.push({
            methodId: method.id,
            taskId: task.id,
            ok: false,
            score: 0,
            error: message,
          })
        }
      }
    }
  }

  await writeResults(opts.outDir, results)
  return results
}
