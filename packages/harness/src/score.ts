import type { Answer, Task } from '@ontology-use/core'
import { expandCompactIri, expandValue, mergePrefixMap } from './iri.js'

export type ScorePair = { ok: boolean; score: number }

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function asString(value: Answer['value']): string | null {
  return typeof value === 'string' ? value : null
}

function asStringArray(value: Answer['value']): string[] | null {
  return Array.isArray(value) ? value.map(String) : null
}

function asFields(value: Answer['value']): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = String(v)
  }
  return out
}

function scoreExact(gold: string, pred: string): ScorePair {
  const score = norm(gold) === norm(pred) ? 1 : 0
  return { ok: score === 1, score }
}

function scoreSet(gold: string[], pred: string[]): ScorePair {
  const g = new Set(gold.map(norm))
  const p = new Set(pred.map(norm))
  if (g.size === 0 && p.size === 0) return { ok: true, score: 1 }
  if (g.size === 0 || p.size === 0) return { ok: false, score: 0 }
  let inter = 0
  for (const x of p) {
    if (g.has(x)) inter++
  }
  const precision = inter / p.size
  const recall = inter / g.size
  const score =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  return { ok: score === 1, score }
}

function scoreFields(
  gold: Record<string, string>,
  pred: Record<string, string>,
): ScorePair {
  const keys = Object.keys(gold)
  if (keys.length === 0) return { ok: true, score: 1 }
  let sum = 0
  for (const k of keys) {
    sum += scoreExact(gold[k] ?? '', pred[k] ?? '').score
  }
  const score = sum / keys.length
  return { ok: score === 1, score }
}

export function scoreAnswer(
  task: Task,
  answer: Answer,
  prefixMap?: Record<string, string>,
): ScorePair {
  const map = mergePrefixMap(prefixMap)
  switch (task.type) {
    case 'exact': {
      const pred = asString(answer.value)
      if (pred === null || typeof task.gold !== 'string') {
        return { ok: false, score: 0 }
      }
      return scoreExact(
        expandCompactIri(task.gold, map),
        expandCompactIri(pred, map),
      )
    }
    case 'set': {
      const pred = asStringArray(answer.value)
      if (pred === null || !Array.isArray(task.gold)) {
        return { ok: false, score: 0 }
      }
      return scoreSet(
        expandValue(task.gold, map) as string[],
        expandValue(pred, map) as string[],
      )
    }
    case 'fields': {
      const pred = asFields(answer.value)
      if (
        pred === null ||
        typeof task.gold !== 'object' ||
        task.gold === null ||
        Array.isArray(task.gold)
      ) {
        return { ok: false, score: 0 }
      }
      return scoreFields(
        expandValue(task.gold, map) as Record<string, string>,
        expandValue(pred, map) as Record<string, string>,
      )
    }
    default:
      return { ok: false, score: 0 }
  }
}
