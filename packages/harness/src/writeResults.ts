import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MethodId, ScoreResult } from '@ontology-use/core'

type MethodSummary = {
  methodId: MethodId
  avgScore: number
  taskCount: number
  failureCount: number
}

function summarize(results: ScoreResult[]): MethodSummary[] {
  const byMethod = new Map<MethodId, ScoreResult[]>()
  for (const r of results) {
    const list = byMethod.get(r.methodId) ?? []
    list.push(r)
    byMethod.set(r.methodId, list)
  }
  const rows: MethodSummary[] = []
  for (const [methodId, list] of [...byMethod.entries()].sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )) {
    const taskCount = list.length
    const failureCount = list.filter((r) => !r.ok).length
    const avgScore =
      taskCount === 0 ? 0 : list.reduce((s, r) => s + r.score, 0) / taskCount
    rows.push({ methodId, avgScore, taskCount, failureCount })
  }
  return rows
}

function toMarkdown(rows: MethodSummary[]): string {
  const lines = [
    '# ontology-use eval results',
    '',
    '| method | avg score | tasks | failures |',
    '| --- | ---: | ---: | ---: |',
  ]
  for (const row of rows) {
    lines.push(
      `| ${row.methodId} | ${row.avgScore.toFixed(4)} | ${row.taskCount} | ${row.failureCount} |`,
    )
  }
  lines.push('')
  return lines.join('\n')
}

export async function writeResults(
  outDir: string,
  results: ScoreResult[],
): Promise<void> {
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'latest.json'), JSON.stringify(results, null, 2) + '\n')
  await writeFile(join(outDir, 'latest.md'), toMarkdown(summarize(results)))
}
