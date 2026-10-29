import { readFile } from 'node:fs/promises'
import type { Answer, Reasoner, Task } from '@ontology-use/core'

export type MethodOpts = { strictMock?: boolean }

export async function readOntologyText(task: Task): Promise<string> {
  if (!task.ontologyRefs?.length) return ''
  const parts: string[] = []
  for (const ref of task.ontologyRefs) {
    try {
      parts.push(await readFile(ref, 'utf8'))
    } catch {
      // missing fixture paths are fine for stub prompts
    }
  }
  return parts.join('\n')
}

export function questionTokens(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[^a-z0-9:/.]+/i)
    .filter((t) => t.length > 2)
}

export function lineChunks(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
}

export function topKMatchingLines(text: string, question: string, k = 5): string[] {
  const tokens = questionTokens(question)
  const scored = lineChunks(text).map((line) => {
    const lower = line.toLowerCase()
    const score = tokens.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0)
    return { line, score }
  })
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.line)
}

export function schemaSummary(ontology: string): string {
  const lines = lineChunks(ontology)
  return lines
    .filter((l) => /\b(owl:Class|rdfs:Class|owl:ObjectProperty|owl:DatatypeProperty|a owl:)/i.test(l) || /rdfs:label/i.test(l))
    .slice(0, 40)
    .join('\n')
}

export function stripMarkdownFence(raw: string): string {
  const trimmed = raw.trim()
  const m = trimmed.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/i)
  return m ? m[1]!.trim() : trimmed
}

export function parseReasonerOutput(raw: string, task: Task): Answer['value'] {
  const trimmed = stripMarkdownFence(raw)
  if (task.type === 'exact') {
    // Unwrap a JSON string literal once (double-quoted). Do not unwrap objects/arrays.
    if (trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        if (typeof parsed === 'string') return parsed
      } catch {
        // fall through to trimmed
      }
    }
    return trimmed
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (task.type === 'set' && Array.isArray(parsed)) return parsed.map(String)
    if (
      task.type === 'fields' &&
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        out[k] = String(v)
      }
      return out
    }
  } catch {
    // fall through
  }
  if (task.type === 'set') return trimmed ? [trimmed] : []
  if (task.type === 'fields') return { value: trimmed }
  return trimmed
}

export function goldShapedValue(task: Task): Answer['value'] {
  return task.gold
}

export function shouldShortcut(reasoner: Reasoner, opts: MethodOpts): boolean {
  return reasoner.id === 'mock' && opts.strictMock !== true
}

export async function runWithPrompt(
  task: Task,
  reasoner: Reasoner,
  opts: MethodOpts,
  buildPrompt: (ontology: string) => string,
  enrich?: (answer: Answer, ontology: string, raw: string) => Answer,
): Promise<Answer> {
  const ontology = await readOntologyText(task)
  if (shouldShortcut(reasoner, opts)) {
    const base: Answer = {
      value: goldShapedValue(task),
      meta: { strategy: 'mock-shortcut' },
    }
    return enrich ? enrich(base, ontology, '') : base
  }
  const prompt = buildPrompt(ontology)
  const raw = await reasoner.complete(prompt)
  const base: Answer = {
    value: parseReasonerOutput(raw, task),
    meta: { strategy: 'reasoner', prompt },
  }
  return enrich ? enrich(base, ontology, raw) : base
}
