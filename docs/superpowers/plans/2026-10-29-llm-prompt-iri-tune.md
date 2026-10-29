# LLM Prompt / IRI Tune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise live MiniMax `--reasoner=llm` scores via output-contract footers, compact↔expanded IRI normalize before score, higher `max_completion_tokens` (still rejecting empty `content`), and truncated answer previews on result rows — without changing the mock gold shortcut (88 × 1.0).

**Architecture:** Centralize the task-type output contract and hardened parse in `packages/methods/src/shared.ts` (`runWithPrompt` + M10). Add IRI expand helpers used inside `scoreAnswer` so every method benefits. Raise reasoner default completion budget and attach `finish_reason` on empty-content errors. Extend `ScoreResult` with optional `answerPreview` / `rawLength` filled by `runEval` / `runWithPrompt`.

**Tech Stack:** TypeScript, vitest, existing npm workspaces (`@ontology-use/core`, `harness`, `methods`, `reasoners-llm`), Node 22 `fetch` (unchanged).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-29-llm-prompt-iri-tune-design.md`
- MiniMax China only (`api.minimax.cn`, default model `MiniMax-M3.1-Flash`)
- Concurrency ≤ **5** (`maxConcurrency: 5` in meta; `runEval` stays sequential unless a semaphore ≤5 is added later)
- Never print or commit API keys
- LLM result trees under `results/llm-*` stay gitignored
- Do not invent eval numbers for the paper; paper cites disk tables only
- Default mock eval must remain **88 × 1.0** (gold shortcut unchanged: `shouldShortcut` when `reasoner.id === 'mock'` && not strict)
- Never treat `reasoning_content` as the scored answer
- Do not invent MiniMax request fields (non-thinking knob stays research TODO)
- Do not change gold JSON files to compact IRIs (runtime normalize only)
- TDD: failing test → implement → pass → commit per task
- Work in `/workspace/ontology-use` on `main` (local-only repo; do not push)
- Do **not** run live MiniMax eval as part of this plan’s Task 6 automation; leave a manual note only

---

## File map

| File | Responsibility |
| --- | --- |
| `packages/harness/src/iri.ts` | **Create.** `DEFAULT_PREFIX_MAP`, `parsePrefixMap`, `expandCompactIri`, `expandValue` |
| `packages/harness/src/iri.test.ts` | **Create.** Unit tests for prefix parse + expand |
| `packages/harness/src/score.ts` | Hook expand on gold + pred inside `scoreAnswer` (optional `prefixMap?`) |
| `packages/harness/src/score.test.ts` | Compact pred vs expanded gold → 1; Alice / unknown prefix unchanged |
| `packages/methods/src/shared.ts` | Fence strip + exact JSON-string unwrap; `outputContractFooter`; append footer in `runWithPrompt`; stash `meta.rawLength` |
| `packages/methods/src/shared.test.ts` | **Create.** Parse + footer + `runWithPrompt` contract tests |
| `packages/methods/src/m10.ts` | Append footer + `rawLength` on non-shortcut path (does not use `runWithPrompt`) |
| `packages/core/src/types.ts` | Optional `answerPreview?`, `rawLength?` on `ScoreResult` |
| `packages/harness/src/eval.ts` | Fill preview / rawLength on success path |
| `packages/harness/src/eval.test.ts` | Assert preview / rawLength persisted when Answer present |
| `packages/harness/src/writeResults.ts` | No logic change required (`JSON.stringify` already persists new fields) |
| `packages/reasoners-llm/src/index.ts` | Default `max_completion_tokens` **4096**; env `MINIMAX_MAX_COMPLETION_TOKENS`; include `finish_reason` in empty-content error |
| `packages/reasoners-llm/src/index.test.ts` | Update default assertion; empty+`finish_reason` message; still reject `reasoning_content` |
| `packages/reasoners-llm/README.md` (or short note under `docs/`) | Document 4096 default + env override if README exists; else one English note in package / eval docs |

---

### Task 1: IRI normalize + score hook

**Files:**
- Create: `packages/harness/src/iri.ts`
- Create: `packages/harness/src/iri.test.ts`
- Modify: `packages/harness/src/score.ts`
- Modify: `packages/harness/src/score.test.ts`

**Interfaces:**
- Consumes: none from later tasks
- Produces:
  - `DEFAULT_PREFIX_MAP: Readonly<Record<string, string>>` with at least `ou` → `http://example.org/ou/`, `fl` → `http://example.org/foaf-lite/`
  - `parsePrefixMap(ontologyText: string): Record<string, string>`
  - `expandCompactIri(s: string, map?: Record<string, string>): string`
  - `expandValue(value: string | string[] | Record<string, string>, map?: Record<string, string>): typeof value` (strings expanded; array elements expanded; field **keys** unchanged, values expanded)
  - `scoreAnswer(task: Task, answer: Answer, prefixMap?: Record<string, string>): ScorePair` — expands gold and pred before exact/set/fields compares; merges `DEFAULT_PREFIX_MAP` under any provided map

- [ ] **Step 1: Write the failing tests** in `packages/harness/src/iri.test.ts` and extend `score.test.ts`

```ts
// packages/harness/src/iri.test.ts
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PREFIX_MAP,
  parsePrefixMap,
  expandCompactIri,
  expandValue,
} from './iri.js'

describe('DEFAULT_PREFIX_MAP', () => {
  it('includes ou and fl pack defaults', () => {
    expect(DEFAULT_PREFIX_MAP.ou).toBe('http://example.org/ou/')
    expect(DEFAULT_PREFIX_MAP.fl).toBe('http://example.org/foaf-lite/')
  })
})

describe('parsePrefixMap', () => {
  it('parses Turtle @prefix lines', () => {
    const text = `@prefix ou: <http://example.org/ou/> .
@prefix fl: <http://example.org/foaf-lite/> .
ou:Person a owl:Class .`
    expect(parsePrefixMap(text)).toMatchObject({
      ou: 'http://example.org/ou/',
      fl: 'http://example.org/foaf-lite/',
    })
  })
})

describe('expandCompactIri', () => {
  it('expands ou:Person and fl:alice with defaults', () => {
    expect(expandCompactIri('ou:Person')).toBe('http://example.org/ou/Person')
    expect(expandCompactIri('fl:alice')).toBe(
      'http://example.org/foaf-lite/alice',
    )
  })

  it('leaves Alice, Introduce, and already-expanded IRIs unchanged', () => {
    expect(expandCompactIri('Alice')).toBe('Alice')
    expect(expandCompactIri('Introduce')).toBe('Introduce')
    expect(expandCompactIri('http://example.org/ou/Person')).toBe(
      'http://example.org/ou/Person',
    )
  })

  it('leaves unknown prefix unchanged', () => {
    expect(expandCompactIri('ex:Thing')).toBe('ex:Thing')
  })
})

describe('expandValue', () => {
  it('expands set elements and field values but not keys', () => {
    expect(expandValue(['ou:alice', 'ou:bob'])).toEqual([
      'http://example.org/ou/alice',
      'http://example.org/ou/bob',
    ])
    expect(
      expandValue({ action: 'AssignWorksAt', objectIds: 'ou:alice' }),
    ).toEqual({
      action: 'AssignWorksAt',
      objectIds: 'http://example.org/ou/alice',
    })
  })
})
```

Add to `packages/harness/src/score.test.ts`:

```ts
  it('exact: compact pred vs expanded gold → 1', () => {
    const t = task({ type: 'exact', gold: 'http://example.org/ou/Person' })
    expect(scoreAnswer(t, { value: 'ou:Person' })).toEqual({
      ok: true,
      score: 1,
    })
  })

  it('exact: Alice literal unchanged path still scores 1', () => {
    const t = task({ type: 'exact', gold: 'Alice' })
    expect(scoreAnswer(t, { value: 'Alice' })).toEqual({ ok: true, score: 1 })
  })

  it('set: compact members vs expanded gold → 1', () => {
    const t = task({
      type: 'set',
      gold: [
        'http://example.org/foaf-lite/alice',
        'http://example.org/foaf-lite/bob',
      ],
    })
    expect(
      scoreAnswer(t, { value: ['fl:bob', 'fl:alice'] }),
    ).toEqual({ ok: true, score: 1 })
  })

  it('fields: compact IRI values vs expanded gold → 1', () => {
    const t = task({
      type: 'fields',
      gold: {
        action: 'Introduce',
        objectIds: 'http://example.org/foaf-lite/alice',
      },
    })
    expect(
      scoreAnswer(t, {
        value: { action: 'Introduce', objectIds: 'fl:alice' },
      }),
    ).toEqual({ ok: true, score: 1 })
  })

  it('unknown compact prefix does not falsely match expanded gold', () => {
    const t = task({ type: 'exact', gold: 'http://example.org/ou/Person' })
    expect(scoreAnswer(t, { value: 'ex:Person' })).toEqual({
      ok: false,
      score: 0,
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/harness/src/iri.test.ts packages/harness/src/score.test.ts`  
Expected: FAIL — `iri.js` missing and/or compact pred still scores 0.

- [ ] **Step 3: Implement `iri.ts` and hook `scoreAnswer`**

```ts
// packages/harness/src/iri.ts
export const DEFAULT_PREFIX_MAP: Readonly<Record<string, string>> = {
  ou: 'http://example.org/ou/',
  fl: 'http://example.org/foaf-lite/',
}

const PREFIX_LINE =
  /@prefix\s+([A-Za-z_][\w-]*)\s*:\s*<([^>]+)>\s*\./g

export function parsePrefixMap(ontologyText: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const m of ontologyText.matchAll(PREFIX_LINE)) {
    map[m[1]!] = m[2]!
  }
  return map
}

const COMPACT = /^([A-Za-z_][\w-]*):(\S+)$/

export function expandCompactIri(
  s: string,
  map: Record<string, string> = { ...DEFAULT_PREFIX_MAP },
): string {
  const m = COMPACT.exec(s)
  if (!m) return s
  const base = map[m[1]!]
  if (!base) return s
  return base + m[2]!
}

export function expandValue(
  value: string | string[] | Record<string, string>,
  map: Record<string, string> = { ...DEFAULT_PREFIX_MAP },
): string | string[] | Record<string, string> {
  if (typeof value === 'string') return expandCompactIri(value, map)
  if (Array.isArray(value)) return value.map((x) => expandCompactIri(x, map))
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = expandCompactIri(v, map)
  }
  return out
}

export function mergePrefixMap(
  extra?: Record<string, string>,
): Record<string, string> {
  return { ...DEFAULT_PREFIX_MAP, ...(extra ?? {}) }
}
```

In `score.ts`, import `expandValue` / `mergePrefixMap` and change `scoreAnswer`:

```ts
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
```

Keep existing `norm` (trim+case) **after** IRI expand inside `scoreExact` / set / fields (unchanged helpers).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/harness/src/iri.test.ts packages/harness/src/score.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/harness/src/iri.ts packages/harness/src/iri.test.ts \
  packages/harness/src/score.ts packages/harness/src/score.test.ts
git commit -m "feat(harness): expand compact IRIs before score"
```

---

### Task 2: Harden `parseReasonerOutput`

**Files:**
- Modify: `packages/methods/src/shared.ts`
- Create: `packages/methods/src/shared.test.ts`

**Interfaces:**
- Consumes: none from Task 1 (parse is independent)
- Produces:
  - `stripMarkdownFence(raw: string): string` (export for tests)
  - `parseReasonerOutput(raw: string, task: Task): Answer['value']` — fence-strip first; for `exact`, unwrap a JSON string literal once; set/fields keep JSON.parse success path + existing fallbacks

- [ ] **Step 1: Write the failing tests** in `packages/methods/src/shared.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { parseReasonerOutput, stripMarkdownFence } from './shared.js'
import type { Task } from '@ontology-use/core'

function task(partial: Partial<Task> & Pick<Task, 'type' | 'gold'>): Task {
  return {
    id: partial.id ?? 't',
    type: partial.type,
    question: partial.question ?? 'q',
    gold: partial.gold,
  }
}

describe('stripMarkdownFence', () => {
  it('unwraps ```json fences', () => {
    expect(stripMarkdownFence('```json\n["a"]\n```')).toBe('["a"]')
  })
  it('unwraps bare ``` fences', () => {
    expect(stripMarkdownFence('```\nhello\n```')).toBe('hello')
  })
  it('returns trimmed text when no fence', () => {
    expect(stripMarkdownFence('  Alice  ')).toBe('Alice')
  })
})

describe('parseReasonerOutput', () => {
  it('exact: plain string', () => {
    expect(
      parseReasonerOutput('Alice', task({ type: 'exact', gold: 'Alice' })),
    ).toBe('Alice')
  })

  it('exact: unwraps JSON string literal once', () => {
    expect(
      parseReasonerOutput('"Alice"', task({ type: 'exact', gold: 'Alice' })),
    ).toBe('Alice')
  })

  it('exact: does not unwrap JSON objects/arrays into strings', () => {
    expect(
      parseReasonerOutput('{"a":1}', task({ type: 'exact', gold: 'x' })),
    ).toBe('{"a":1}')
    expect(
      parseReasonerOutput('["a"]', task({ type: 'exact', gold: 'x' })),
    ).toBe('["a"]')
  })

  it('exact: fence then JSON string', () => {
    expect(
      parseReasonerOutput('```\n"Bob"\n```', task({ type: 'exact', gold: 'Bob' })),
    ).toBe('Bob')
  })

  it('set: JSON array', () => {
    expect(
      parseReasonerOutput(
        '["http://example.org/ou/alice"]',
        task({ type: 'set', gold: ['http://example.org/ou/alice'] }),
      ),
    ).toEqual(['http://example.org/ou/alice'])
  })

  it('set: fenced JSON array', () => {
    expect(
      parseReasonerOutput(
        '```json\n["ou:alice"]\n```',
        task({ type: 'set', gold: ['ou:alice'] }),
      ),
    ).toEqual(['ou:alice'])
  })

  it('set: non-JSON fallback is one-element array', () => {
    expect(
      parseReasonerOutput('prose', task({ type: 'set', gold: ['a'] })),
    ).toEqual(['prose'])
  })

  it('fields: JSON object', () => {
    expect(
      parseReasonerOutput(
        '{"action":"Introduce","objectIds":"fl:alice"}',
        task({
          type: 'fields',
          gold: { action: 'Introduce', objectIds: 'fl:alice' },
        }),
      ),
    ).toEqual({ action: 'Introduce', objectIds: 'fl:alice' })
  })

  it('fields: non-JSON fallback is { value: trimmed }', () => {
    expect(
      parseReasonerOutput(
        'nope',
        task({ type: 'fields', gold: { action: 'X' } }),
      ),
    ).toEqual({ value: 'nope' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/methods/src/shared.test.ts`  
Expected: FAIL — `stripMarkdownFence` not exported / exact `"Alice"` still returns quoted form / fences not stripped.

- [ ] **Step 3: Implement parse harden in `shared.ts`**

Replace `parseReasonerOutput` (and add helper) with:

```ts
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
```

Note: only unwrap when `JSON.parse` yields a **string** (spec: do not unwrap objects/arrays into exact strings). Only attempt unwrap for double-quoted JSON string literals.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/methods/src/shared.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/methods/src/shared.ts packages/methods/src/shared.test.ts
git commit -m "feat(methods): harden parseReasonerOutput (fence + JSON string)"
```

---

### Task 3: `outputContractFooter` + wire into `runWithPrompt` / M10

**Files:**
- Modify: `packages/methods/src/shared.ts`
- Modify: `packages/methods/src/shared.test.ts`
- Modify: `packages/methods/src/m10.ts`

**Interfaces:**
- Consumes: `parseReasonerOutput` / `stripMarkdownFence` from Task 2
- Produces:
  - `outputContractFooter(task: Task): string` — English footer by `task.type`; for `fields`, keys from `Object.keys(task.gold)` when gold is a plain object
  - `runWithPrompt(...)` appends footer to `buildPrompt(ontology)` **only** on the non-shortcut path; mock shortcut still returns gold and never sees the footer
  - M10 non-shortcut path appends the same footer

- [ ] **Step 1: Write the failing tests** (append to `shared.test.ts`)

```ts
import {
  parseReasonerOutput,
  stripMarkdownFence,
  outputContractFooter,
  runWithPrompt,
  shouldShortcut,
} from './shared.js'
import type { Reasoner } from '@ontology-use/core'

describe('outputContractFooter', () => {
  it('exact asks for a single plain string', () => {
    const f = outputContractFooter(task({ type: 'exact', gold: 'Alice' }))
    expect(f).toMatch(/single plain string/i)
    expect(f).toMatch(/No JSON/i)
  })

  it('set asks for a JSON array of strings', () => {
    const f = outputContractFooter(
      task({ type: 'set', gold: ['http://example.org/ou/alice'] }),
    )
    expect(f).toMatch(/JSON array of strings/i)
  })

  it('fields lists gold keys', () => {
    const f = outputContractFooter(
      task({
        type: 'fields',
        gold: { action: 'Introduce', objectIds: 'x' },
      }),
    )
    expect(f).toMatch(/JSON object/i)
    expect(f).toContain('action')
    expect(f).toContain('objectIds')
  })
})

describe('runWithPrompt contract wiring', () => {
  it('appends footer for live reasoner and keeps mock shortcut gold without footer', async () => {
    let seenPrompt = ''
    const llm: Reasoner = {
      id: 'llm',
      async complete(prompt) {
        seenPrompt = prompt
        return 'Alice'
      },
    }
    const t = task({ type: 'exact', gold: 'Alice' })
    await runWithPrompt(t, llm, {}, () => 'BASE_PROMPT')
    expect(seenPrompt.startsWith('BASE_PROMPT')).toBe(true)
    expect(seenPrompt).toMatch(/OUTPUT CONTRACT/i)
    expect(seenPrompt).toMatch(/single plain string/i)

    const mock: Reasoner = {
      id: 'mock',
      async complete() {
        throw new Error('should not be called')
      },
    }
    const ans = await runWithPrompt(t, mock, {}, () => 'BASE_PROMPT')
    expect(ans.value).toBe('Alice')
    expect(ans.meta?.strategy).toBe('mock-shortcut')
    expect(shouldShortcut(mock, {})).toBe(true)
  })
})
```

Also add a focused M10 test (either in `shared.test.ts` or a small `m10.test.ts`):

```ts
// packages/methods/src/m10.test.ts
import { describe, it, expect } from 'vitest'
import { createM10 } from './m10.js'
import type { Reasoner, Task } from '@ontology-use/core'

describe('createM10 output contract', () => {
  it('appends OUTPUT CONTRACT on non-shortcut path', async () => {
    let seen = ''
    const reasoner: Reasoner = {
      id: 'llm',
      async complete(p) {
        seen = p
        return '{"action":"Introduce","objectIds":"fl:alice"}'
      },
    }
    const task: Task = {
      id: 'foaf-t003',
      type: 'fields',
      question: 'Introduce alice',
      gold: { action: 'Introduce', objectIds: 'http://example.org/foaf-lite/alice' },
      ontologyRefs: [],
    }
    await createM10().run(task, reasoner)
    expect(seen).toMatch(/OUTPUT CONTRACT/i)
    expect(seen).toContain('action')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/methods/src/shared.test.ts packages/methods/src/m10.test.ts`  
Expected: FAIL — `outputContractFooter` missing / prompts lack contract.

- [ ] **Step 3: Implement footer + wiring**

In `shared.ts`:

```ts
export function outputContractFooter(task: Task): string {
  if (task.type === 'exact') {
    return (
      '\n\nOUTPUT CONTRACT:\n' +
      'Reply with the answer as a single plain string only. ' +
      'No JSON, no markdown fences, no explanation.\n'
    )
  }
  if (task.type === 'set') {
    return (
      '\n\nOUTPUT CONTRACT:\n' +
      'Reply with a JSON array of strings only ' +
      '(e.g. ["http://…","http://…"]). No prose, no markdown fences.\n'
    )
  }
  if (task.type === 'fields') {
    const keys =
      task.gold &&
      typeof task.gold === 'object' &&
      !Array.isArray(task.gold)
        ? Object.keys(task.gold)
        : []
    return (
      '\n\nOUTPUT CONTRACT:\n' +
      'Reply with a JSON object only whose keys are exactly: ' +
      `${keys.join(', ')}. No prose, no markdown fences.\n`
    )
  }
  return ''
}
```

In `runWithPrompt`, change the live path only:

```ts
  const prompt = buildPrompt(ontology) + outputContractFooter(task)
  const raw = await reasoner.complete(prompt)
  const base: Answer = {
    value: parseReasonerOutput(raw, task),
    meta: { strategy: 'reasoner', prompt, rawLength: raw.length },
  }
  return enrich ? enrich(base, ontology, raw) : base
```

(Leave mock-shortcut branch untouched — no footer, no `complete` call.)

In `m10.ts` non-shortcut path:

```ts
      const prompt =
        `ACTION_SDK\nONTOLOGY:\n${ontology}\n\nQUESTION:\n${task.question}\n` +
        outputContractFooter(task)
      const raw = await reasoner.complete(prompt)
      const parsed = parseReasonerOutput(raw, task)
      return {
        value: parsed,
        meta: {
          strategy: 'reasoner',
          prompt,
          rawLength: raw.length,
          actionEnvelope: asActionFields(parsed),
        },
      }
```

Import `outputContractFooter` in `m10.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/methods/src/shared.test.ts packages/methods/src/m10.test.ts packages/methods/src/registry.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/methods/src/shared.ts packages/methods/src/shared.test.ts \
  packages/methods/src/m10.ts packages/methods/src/m10.test.ts
git commit -m "feat(methods): task-type output contract footer for llm path"
```

---

### Task 4: Answer preview + `rawLength` on `ScoreResult`

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/harness/src/eval.ts`
- Modify: `packages/harness/src/eval.test.ts`
- Modify: `packages/methods/src/shared.ts` (ensure `meta.rawLength` from Task 3; add assertion in shared tests if not already)
- Touch only if needed: `packages/harness/src/writeResults.ts` (no code change expected — JSON already serializes optional fields)

**Interfaces:**
- Consumes: `meta.rawLength` from Task 3 (`runWithPrompt` / M10)
- Produces:
  - `ScoreResult.answerPreview?: string` — `JSON.stringify(answer.value)` truncated to ≤ 200 chars with `…` if truncated
  - `ScoreResult.rawLength?: number` — from `answer.meta.rawLength` when it is a finite number
  - On throw path: no preview / rawLength; keep `error`

- [ ] **Step 1: Write the failing tests**

Extend `packages/core/src/types.test.ts` or rely on harness tests. Prefer harness:

```ts
// append inside packages/harness/src/eval.test.ts describe('runEval')
  it('includes truncated answerPreview and rawLength on success', async () => {
    const long = 'x'.repeat(250)
    const method: Method = {
      id: 'M0',
      name: 'Fake',
      async run() {
        return {
          value: long,
          meta: { strategy: 'reasoner', rawLength: 42 },
        }
      },
    }
    const reasoner: Reasoner = { id: 'llm', async complete() { return long } }
    const results = await runEval({
      packsRoot: root,
      methods: [method],
      reasoner,
      outDir,
    })
    const row = results[0]!
    expect(row.answerPreview).toBeDefined()
    expect(row.answerPreview!.length).toBeLessThanOrEqual(201) // 200 + ellipsis
    expect(row.answerPreview!.endsWith('…')).toBe(true)
    expect(row.rawLength).toBe(42)

    const json = JSON.parse(await readFile(join(outDir, 'latest.json'), 'utf8'))
    expect(json[0].answerPreview).toBe(row.answerPreview)
    expect(json[0].rawLength).toBe(42)
  })

  it('omits preview on throw path and keeps error', async () => {
    const method: Method = {
      id: 'M0',
      name: 'Boom',
      async run() {
        throw new Error('boom')
      },
    }
    const reasoner: Reasoner = { id: 'llm', async complete() { return '' } }
    const results = await runEval({
      packsRoot: root,
      methods: [method],
      reasoner,
      outDir,
    })
    expect(results[0]!.error).toMatch(/boom/)
    expect(results[0]!.answerPreview).toBeUndefined()
    expect(results[0]!.rawLength).toBeUndefined()
  })
```

Also assert in `shared.test.ts` that live `runWithPrompt` sets `meta.rawLength`:

```ts
  it('stashes rawLength on reasoner answers', async () => {
    const llm: Reasoner = {
      id: 'llm',
      async complete() {
        return 'Alice'
      },
    }
    const ans = await runWithPrompt(
      task({ type: 'exact', gold: 'Alice' }),
      llm,
      {},
      () => 'P',
    )
    expect(ans.meta?.rawLength).toBe(5)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/harness/src/eval.test.ts packages/methods/src/shared.test.ts`  
Expected: FAIL — `answerPreview` / type fields missing.

- [ ] **Step 3: Implement types + eval helper**

In `packages/core/src/types.ts`:

```ts
export type ScoreResult = {
  methodId: MethodId
  taskId: string
  ok: boolean
  score: number
  error?: string
  /** Truncated JSON/string preview of answer.value; optional */
  answerPreview?: string
  /** Length of raw reasoner completion when available */
  rawLength?: number
}
```

In `eval.ts`:

```ts
function previewAnswer(value: Answer['value']): string {
  const s = JSON.stringify(value)
  if (s.length <= 200) return s
  return `${s.slice(0, 200)}…`
}

function rawLengthFromMeta(meta: Record<string, unknown> | undefined): number | undefined {
  const n = meta?.rawLength
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

// inside success branch:
          const answer = await method.run(task, opts.reasoner)
          const { ok, score } = scoreAnswer(task, answer)
          const row: ScoreResult = {
            methodId: method.id,
            taskId: task.id,
            ok,
            score,
            answerPreview: previewAnswer(answer.value),
            rawLength: rawLengthFromMeta(answer.meta),
          }
          // omit undefined rawLength for cleanliness if desired:
          if (row.rawLength === undefined) delete row.rawLength
          results.push(row)
```

Import `Answer` / `ScoreResult` as needed. `writeResults` needs no change.

Mock shortcut rows may include preview of gold — that is fine (scores stay 1.0).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/harness/src/eval.test.ts packages/core packages/methods/src/shared.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/harness/src/eval.ts \
  packages/harness/src/eval.test.ts packages/methods/src/shared.test.ts
git commit -m "feat(harness): persist answerPreview and rawLength on ScoreResult"
```

---

### Task 5: `max_completion_tokens` 4096 + `finish_reason` on empty error

**Files:**
- Modify: `packages/reasoners-llm/src/index.ts`
- Modify: `packages/reasoners-llm/src/index.test.ts`
- Modify (docs): `packages/reasoners-llm/package.json` has no README today — create a short `packages/reasoners-llm/README.md` **or** add a bullet under `docs/paper/04-experiments.md` / PRODUCT eval notes documenting default 4096 and `MINIMAX_MAX_COMPLETION_TOKENS`. Prefer creating `packages/reasoners-llm/README.md` (English).

**Interfaces:**
- Consumes: none from Tasks 1–4
- Produces:
  - Default `max_completion_tokens` = **4096**
  - Override order: `opts.maxCompletionTokens` → env `MINIMAX_MAX_COMPLETION_TOKENS` (positive finite number) → `4096`
  - Empty `content` still throws; message still forbids using `reasoning_content`; if `choices[0].finish_reason` is a string, append `; finish_reason=<value>` (truncated if huge)
  - Comment: `# TODO(research): MiniMax non-thinking / reasoning budget knob — unverified; do not invent API fields.`

- [ ] **Step 1: Update failing tests** in `index.test.ts`

Change the default assertion:

```ts
  it('defaults max_completion_tokens to 4096 in the request body', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: 'pong' } }],
      }),
    )
    const r = createLlmReasoner({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await r.complete('hi')
    const body = JSON.parse(String(fetchImpl.mock.calls[0]![1]?.body))
    expect(body.max_completion_tokens).toBe(4096)
  })
```

Keep override test (64). Add:

```ts
  it('rejects empty content even when reasoning_content present and includes finish_reason', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [
          {
            finish_reason: 'length',
            message: { content: '', reasoning_content: 'think' },
          },
        ],
      }),
    )
    const r = createLlmReasoner({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await expect(r.complete('hi')).rejects.toThrow(/empty|content/i)
    await expect(r.complete('hi')).rejects.toThrow(/finish_reason=length/)
  })

  it('honors MINIMAX_MAX_COMPLETION_TOKENS env when opts omit maxCompletionTokens', async () => {
    const prev = process.env.MINIMAX_MAX_COMPLETION_TOKENS
    process.env.MINIMAX_MAX_COMPLETION_TOKENS = '1024'
    try {
      const fetchImpl = vi.fn(async () =>
        Response.json({ choices: [{ message: { content: 'pong' } }] }),
      )
      const r = createLlmReasoner({
        apiKey: 'test-key',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      await r.complete('hi')
      const body = JSON.parse(String(fetchImpl.mock.calls[0]![1]?.body))
      expect(body.max_completion_tokens).toBe(1024)
    } finally {
      if (prev === undefined) delete process.env.MINIMAX_MAX_COMPLETION_TOKENS
      else process.env.MINIMAX_MAX_COMPLETION_TOKENS = prev
    }
  })
```

Update the existing empty-content test to still reject when `reasoning_content` is present (already does).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/reasoners-llm`  
Expected: FAIL — default still 2048 / no `finish_reason` in message / env not wired.

- [ ] **Step 3: Implement**

In `index.ts`:

```ts
function resolveMaxCompletionTokens(opts?: LlmReasonerOptions): number {
  if (opts?.maxCompletionTokens !== undefined) return opts.maxCompletionTokens
  const env = process.env.MINIMAX_MAX_COMPLETION_TOKENS
  if (env !== undefined && env !== '') {
    const n = Number(env)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 4096
}

// inside createLlmReasoner:
  const maxCompletionTokens = resolveMaxCompletionTokens(opts)

// TODO(research): MiniMax non-thinking / reasoning budget knob — unverified; do not invent API fields.

// parse type:
      let data: {
        choices?: Array<{
          finish_reason?: string
          message?: { content?: string | null; reasoning_content?: string }
        }>
        usage?: Partial<TokenUsage>
      }

// empty content:
      const choice = data.choices?.[0]
      const content = choice?.message?.content
      if (content == null || String(content).trim() === '') {
        const fr = choice?.finish_reason
        const frPart =
          typeof fr === 'string' && fr.length > 0
            ? `; finish_reason=${fr.slice(0, 64)}`
            : ''
        throw new Error(
          'MiniMax returned empty message.content (do not use reasoning_content as the answer; try higher max_completion_tokens)' +
            frPart,
        )
      }
```

Write `packages/reasoners-llm/README.md`:

```md
# @ontology-use/reasoners-llm

MiniMax China OpenAI-compatible reasoner (`https://api.minimax.cn/v1`).

- Default model: `MiniMax-M3.1-Flash`
- Default `max_completion_tokens`: **4096** (override with `createLlmReasoner({ maxCompletionTokens })` or env `MINIMAX_MAX_COMPLETION_TOKENS`)
- Empty `message.content` is an error; `reasoning_content` is never scored as the answer
- Concurrent API hard cap constant: `LLM_MAX_CONCURRENCY = 5`
- Never commit `MINIMAX_API_KEY`
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/reasoners-llm`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/reasoners-llm/src/index.ts packages/reasoners-llm/src/index.test.ts \
  packages/reasoners-llm/README.md
git commit -m "feat(reasoners-llm): default max_completion_tokens 4096 + finish_reason"
```

---

### Task 6: Verification (mock matrix + unit suite; live note only)

**Files:**
- No application source changes expected
- Optional one-line note in `docs/paper/04-experiments.md` or PRODUCT only if needed to say “after prompt/IRI tune, re-run `npm run eval -- --reasoner=llm` into a new `results/llm-*`” — **do not invent scores**

**Interfaces:**
- Consumes: Tasks 1–5 complete
- Produces: green vitest; mock eval **88 × 1.0**; written note that live MiniMax re-run is manual / gated

- [ ] **Step 1: Full unit suite**

Run: `npm test`  
Expected: all packages PASS (including new iri / shared / m10 / eval / reasoners-llm tests).

- [ ] **Step 2: Default mock eval still 88 × 1.0**

Run: `npm run eval`  
Then verify:

```bash
node -e "
const r=require('./results/latest.json');
const n=r.length;
const ones=r.filter(x=>x.score===1&&x.ok).length;
console.log({n, ones});
if(n!==88||ones!==88) process.exit(1);
"
```

Expected: `{ n: 88, ones: 88 }`. Confirm mock shortcut still bypasses footer (no regression in strict-mock tests if present: `npm run eval -- --strict` or existing `results/strict` checks — run whatever the repo already uses for strict; do not break it).

- [ ] **Step 3: Live llm re-run — manual only (do not execute in this task)**

Document for the operator (do **not** call the API from the implementing agent unless Way explicitly asks in a later turn):

```bash
# Requires MINIMAX_API_KEY; writes gitignored results/llm-<stamp>/
npm run eval -- --reasoner=llm
# Compare empty-content count vs 17; check non-Alice IRI/set/fields can score >0
# Inspect answerPreview on silent-zero rows in latest.json
# Do not commit results/llm-* ; paper cites disk paths only
```

Success criteria from spec (measured on that future run, not assumed here): empty-content **< 17**; some non-Alice compact/expanded answers can score **> 0**; preview present when Answer exists.

- [ ] **Step 4: Commit only if Step 3 produced a docs one-liner** (otherwise no commit)

```bash
# only when a docs note was added:
git add docs/paper/04-experiments.md   # or PRODUCT.md — whichever was edited
git commit -m "docs: note post-tune llm re-run under results/llm-*"
```

If no docs file changed, skip commit.

---

## Deferred

**Retrieval hyphen / local-name matching** (`questionTokens` splits on `[^a-z0-9:/.]+`, breaking `foaf-lite`): explicitly **deferred** per spec §6. Do not implement in Tasks 1–6. Follow-up should either allow hyphen inside tokens or add local-name fallbacks (`alice`, `Person`) with its own TDD commit. Primary Approach C items (contract + IRI + empty mitigation + preview) must not wait on this.

---

## Self-review (spec coverage)

| Spec requirement | Task |
| --- | --- |
| Output contract footer by task type; gold keys for fields | Task 3 |
| Footer only on non-shortcut path; mock gold shortcut untouched | Task 3 |
| Harden parse: fence strip; exact JSON-string unwrap; set/fields fallbacks kept | Task 2 |
| Expand both gold and pred before score; defaults `ou:` / `fl:` | Task 1 |
| Literals / action names / unknown prefix unchanged | Task 1 |
| Scorers keep trim+case after expand | Task 1 |
| Default `max_completion_tokens` 2048→4096; env override | Task 5 |
| Empty content still throws; never score `reasoning_content` | Task 5 |
| Attach `finish_reason` when present; no invented API fields; research TODO | Task 5 |
| `ScoreResult.answerPreview` / `rawLength`; `runEval` + `meta.rawLength` | Task 4 |
| `writeResults` persists optional fields; markdown table unchanged | Task 4 (JSON path) |
| Mock eval remains 88 × 1.0 | Task 6 |
| Live llm re-run gated; do not invent paper numbers | Task 6 |
| Hyphen tokenisation deferrable | Deferred section |
| Concurrency ≤5 / no key leaks / llm results gitignored | Global Constraints (unchanged code paths) |

**Placeholder scan:** no TBD/TODO in task steps except the explicit research TODO comment required by the spec.  
**Type consistency:** `ScoreResult.answerPreview` / `rawLength`; `meta.rawLength`; `outputContractFooter(task)`; `expandCompactIri` / `parsePrefixMap` / `scoreAnswer(..., prefixMap?)`; default tokens **4096**.

