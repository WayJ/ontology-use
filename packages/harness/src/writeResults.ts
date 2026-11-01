import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MethodId, ScoreResult } from '@ontology-use/core'

type TaskType = 'exact' | 'set' | 'fields'

type MethodSummary = {
  methodId: MethodId
  avgScore: number
  taskCount: number
  failureCount: number
  avgExact: number | null
  avgSet: number | null
  avgFields: number | null
  byType: { exact?: number; set?: number; fields?: number }
}

function mean(scores: number[]): number | null {
  if (scores.length === 0) return null
  return scores.reduce((s, n) => s + n, 0) / scores.length
}

function typeMean(list: ScoreResult[], type: TaskType): number | null {
  const scores = list
    .filter((r) => r.taskType === type)
    .map((r) => r.score)
  return mean(scores)
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
    const avgExact = typeMean(list, 'exact')
    const avgSet = typeMean(list, 'set')
    const avgFields = typeMean(list, 'fields')
    const byType: MethodSummary['byType'] = {}
    if (avgExact !== null) byType.exact = avgExact
    if (avgSet !== null) byType.set = avgSet
    if (avgFields !== null) byType.fields = avgFields
    rows.push({
      methodId,
      avgScore,
      taskCount,
      failureCount,
      avgExact,
      avgSet,
      avgFields,
      byType,
    })
  }
  return rows
}

function fmtAvg(n: number | null): string {
  return n === null ? '—' : n.toFixed(4)
}

function toMarkdown(rows: MethodSummary[]): string {
  const lines = [
    '# ontology-use eval results',
    '',
    '| method | avg score | tasks | failures | avgExact | avgSet | avgFields |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ]
  for (const row of rows) {
    lines.push(
      `| ${row.methodId} | ${row.avgScore.toFixed(4)} | ${row.taskCount} | ${row.failureCount} | ${fmtAvg(row.avgExact)} | ${fmtAvg(row.avgSet)} | ${fmtAvg(row.avgFields)} |`,
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
  const summaries = summarize(results)
  await writeFile(join(outDir, 'latest.json'), JSON.stringify(results, null, 2) + '\n')
  await writeFile(join(outDir, 'latest.md'), toMarkdown(summaries))
  await writeFile(
    join(outDir, 'latest.summary.json'),
    JSON.stringify(
      summaries.map(({ methodId, avgScore, taskCount, failureCount, byType }) => ({
        methodId,
        avgScore,
        taskCount,
        failureCount,
        byType,
      })),
      null,
      2,
    ) + '\n',
  )
}
