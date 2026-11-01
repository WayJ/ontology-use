# Eval type-bucket reporting + optional Task.evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Report per-method mean scores bucketed by `Task.type` (`exact` / `set` / `fields`) in eval markdown (and machine-readable summary), and optionally passthrough `Task.evidence` into result JSON without changing `scoreAnswer`.

**Architecture:** Extend `@ontology-use/core` types (`ScoreResult.taskType` required; `Task.evidence?` and `ScoreResult.evidence?` optional). `runEval` copies `task.type` → `taskType` on every row (success and catch), and copies `task.evidence` onto the row when present. `writeResults` keeps `latest.json` as a `ScoreResult[]` (now with `taskType` / optional `evidence`), extends method summary with type-bucket averages (empty bucket → `—`, never `0`), and writes additive `latest.summary.json` with `byType` for machine readers. `loadPacks`/`isTask` validate optional `evidence` shape. No pack JSON changes; no scorer changes.

**Tech Stack:** TypeScript, vitest, npm workspaces (`packages/core`, `packages/harness`), existing `runEval` / `writeResults` / `loadEnabledPacks`, Node 22.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-01-eval-type-bucket-evidence-design.md` (on `main` at `a331e7d`)
- Approach **A** only: type-bucket columns + optional evidence passthrough; do **NOT** change `scoreAnswer`
- Empty type bucket cell = `—` not `0`
- No new pack tasks; no `constraintPass`; no MiniMax re-run; no remote push
- Work on branch `feat/eval-type-bucket-evidence` (Task 0: create from current `main`)
- Do not revert unrelated commits already on `main` (timeout etc.)
- TDD: failing test → implement → pass → commit per task
- Work in `/workspace/ontology-use` (local-only)
- When touching `eval.ts`, only add `taskType` / optional `evidence` assignment; do not mix unrelated progress/timeout edits into feature commits (those commits may already exist on `main` — leave them alone)

---

## File map

| File | Responsibility |
| --- | --- |
| `packages/core/src/types.ts` | Add `ScoreResult.taskType`; `Task.evidence?`; `ScoreResult.evidence?` |
| `packages/core/src/types.test.ts` | Light runtime shape checks for new fields (optional but keep green) |
| `packages/harness/src/loadPacks.ts` | `isTask` accepts/rejects optional `evidence` |
| `packages/harness/src/loadPacks.test.ts` | Fixture accept string / string[]; reject bad evidence |
| `packages/harness/src/eval.ts` | Set `taskType` on success + catch rows; copy `evidence` when present |
| `packages/harness/src/eval.test.ts` | Assert `taskType` + evidence echo in `latest.json` |
| `packages/harness/src/writeResults.ts` | Type-bucket averages; md columns; `latest.summary.json` with `byType` |
| `packages/harness/src/writeResults.test.ts` | **Create** — unit tests for md `—` and summary `byType` |
| `packages/harness/src/e2e.test.ts` | Assert md headers contain `avgExact` / `avgSet` / `avgFields` |
| `PRODUCT.md` | One-liner: type-bucket reporting; evidence optional / not scored |
| `packages/harness/src/score.ts` | **Do not modify** |

---

### Task 0: Create feature branch

**Files:** none (git only)

**Interfaces:**
- Consumes: clean `main` tip including design `a331e7d` (and any later main-only commits such as timeout — do not revert)
- Produces: local branch `feat/eval-type-bucket-evidence`

- [ ] **Step 1: Branch from main**

```bash
cd /workspace/ontology-use
git checkout main
git status   # working tree should be clean; stash/commit unrelated WIP first if needed
git checkout -b feat/eval-type-bucket-evidence
```

Expected: `On branch feat/eval-type-bucket-evidence`

- [ ] **Step 2: No commit yet** (branch tip equals `main`)

---

### Task 1: Types — `taskType` + optional `evidence`

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/types.test.ts`

**Interfaces:**
- Consumes: existing `Task`, `ScoreResult`
- Produces:
  - `Task.evidence?: string | string[]`
  - `ScoreResult.taskType: 'exact' | 'set' | 'fields'` (required)
  - `ScoreResult.evidence?: string | string[]` (optional echo of task provenance; **not** used by scorer)

- [ ] **Step 1: Write the failing / documenting tests**

Extend `packages/core/src/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isMethodId } from './types.js'
import type { ScoreResult, Task } from './types.js'

describe('isMethodId', () => {
  it('accepts M0 and M10', () => {
    expect(isMethodId('M0')).toBe(true)
    expect(isMethodId('M10')).toBe(true)
  })
  it('rejects junk', () => {
    expect(isMethodId('M11')).toBe(false)
  })
})

describe('Task / ScoreResult evidence + taskType shapes', () => {
  it('allows Task without evidence and with string or string[] evidence', () => {
    const base: Task = {
      id: 't1',
      type: 'exact',
      question: 'q',
      gold: 'g',
    }
    const withStr: Task = { ...base, evidence: 'doc#p1' }
    const withArr: Task = { ...base, evidence: ['doc#p1', 'doc#p2'] }
    expect(withStr.evidence).toBe('doc#p1')
    expect(withArr.evidence).toEqual(['doc#p1', 'doc#p2'])
  })

  it('requires ScoreResult.taskType and optional evidence echo', () => {
    const row: ScoreResult = {
      methodId: 'M0',
      taskId: 't1',
      ok: true,
      score: 1,
      taskType: 'exact',
      evidence: 'doc#p1',
    }
    expect(row.taskType).toBe('exact')
    expect(row.evidence).toBe('doc#p1')
  })
})
```

- [ ] **Step 2: Run test to verify type/compile status**

```bash
cd /workspace/ontology-use
npx vitest run packages/core/src/types.test.ts
```

Expected: **FAIL** (or tsc/vitest transform error) because `ScoreResult` lacks `taskType` / `evidence` and `Task` lacks `evidence` — e.g. excess property or missing property under `tsc`.

If vitest does not typecheck excess properties on its own, still proceed to Step 3; the test documents the contract and will compile once types are updated. Optionally confirm with:

```bash
npx tsc -p packages/core --noEmit
```

(only if the package has a tsconfig; otherwise rely on workspace vitest/tsconfig).

- [ ] **Step 3: Minimal type implementation**

In `packages/core/src/types.ts`, update `Task` and `ScoreResult` to:

```ts
export type Task = {
  id: string
  type: 'exact' | 'set' | 'fields'
  question: string
  gold: string | string[] | Record<string, string>
  ontologyRefs?: string[]
  /** Provenance / source refs; not used by scoreAnswer */
  evidence?: string | string[]
}

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
  /** Copied from task.type at score time */
  taskType: 'exact' | 'set' | 'fields'
  /** Copied from task.evidence when present; not scored */
  evidence?: string | string[]
}
```

Leave `isMethodId` / `METHOD_IDS` unchanged.

- [ ] **Step 4: Run tests**

```bash
npx vitest run packages/core/src/types.test.ts
```

Expected: PASS for the new describe block.

Note: `packages/harness/src/eval.ts` will now fail typecheck until Task 3 sets `taskType` on constructed rows. That is expected if the whole monorepo is typechecked together; do **not** fix eval in this commit beyond what is required for core tests to pass. Prefer committing Task 1 as types-only; if CI/typecheck blocks mid-branch, finish Task 3 in the same sitting after Task 2, but still keep separate commits when possible.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/types.test.ts
git commit -m "feat(core): ScoreResult.taskType + optional Task/ScoreResult.evidence"
```

---

### Task 2: `loadPacks` — accept / reject `evidence`

**Files:**
- Modify: `packages/harness/src/loadPacks.ts`
- Modify: `packages/harness/src/loadPacks.test.ts`

**Interfaces:**
- Consumes: `Task.evidence?: string | string[]` from Task 1
- Produces: `isTask` returns true for valid optional `evidence`; false / load throws for wrong types; omitted `evidence` unchanged

- [ ] **Step 1: Write the failing tests**

Append to `packages/harness/src/loadPacks.test.ts` (keep existing tests):

```ts
  it('accepts optional evidence as string or string[]', async () => {
    await writeFile(
      join(root, 'packs-public-mini', 'tasks', 't003-evidence.json'),
      JSON.stringify({
        id: 't003',
        type: 'exact',
        question: 'With evidence?',
        gold: 'http://example.org/ou/Person',
        evidence: 'mini.ttl#alice',
        ontologyRefs: ['ontology/mini.ttl'],
      }),
    )
    await writeFile(
      join(root, 'packs-public-mini', 'tasks', 't004-evidence-arr.json'),
      JSON.stringify({
        id: 't004',
        type: 'set',
        question: 'With evidence array?',
        gold: ['http://example.org/ou/alice'],
        evidence: ['mini.ttl#alice', 'mini.ttl#Person'],
        ontologyRefs: ['ontology/mini.ttl'],
      }),
    )
    const packs = await loadEnabledPacks(root)
    const byId = Object.fromEntries(packs[0]!.tasks.map((t) => [t.id, t]))
    expect(byId.t003!.evidence).toBe('mini.ttl#alice')
    expect(byId.t004!.evidence).toEqual(['mini.ttl#alice', 'mini.ttl#Person'])
  })

  it('rejects tasks whose evidence is not string or string[]', async () => {
    await writeFile(
      join(root, 'packs-public-mini', 'tasks', 't-bad-evidence.json'),
      JSON.stringify({
        id: 't-bad',
        type: 'exact',
        question: 'bad',
        gold: 'x',
        evidence: { page: 1 },
      }),
    )
    await expect(loadEnabledPacks(root)).rejects.toThrow(/Invalid task/)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run packages/harness/src/loadPacks.test.ts
```

Expected: FAIL — today `isTask` does not validate `evidence`, so `{ page: 1 }` is accepted and the reject test fails; the accept test may already pass via spread. Focus on the reject test failing first.

- [ ] **Step 3: Minimal `isTask` implementation**

In `packages/harness/src/loadPacks.ts`, replace `isTask` with:

```ts
function isEvidence(value: unknown): value is string | string[] {
  if (typeof value === 'string') return true
  if (!Array.isArray(value)) return false
  return value.every((item) => typeof item === 'string')
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const t = value as Record<string, unknown>
  if (
    typeof t.id !== 'string' ||
    (t.type !== 'exact' && t.type !== 'set' && t.type !== 'fields') ||
    typeof t.question !== 'string' ||
    !('gold' in t)
  ) {
    return false
  }
  if ('evidence' in t && t.evidence !== undefined && !isEvidence(t.evidence)) {
    return false
  }
  return true
}
```

Do not change `loadPackDir` spread / `ontologyRefs` resolution — `evidence` rides through `...task`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run packages/harness/src/loadPacks.test.ts
```

Expected: PASS (including existing resolve/`enabled:false` tests).

- [ ] **Step 5: Commit**

```bash
git add packages/harness/src/loadPacks.ts packages/harness/src/loadPacks.test.ts
git commit -m "feat(harness): validate optional Task.evidence in loadPacks"
```

---

### Task 3: `eval.ts` — set `taskType` (+ optional `evidence`)

**Files:**
- Modify: `packages/harness/src/eval.ts`
- Modify: `packages/harness/src/eval.test.ts`

**Interfaces:**
- Consumes: `ScoreResult.taskType`, `ScoreResult.evidence?`, `Task.evidence?`
- Produces: every `ScoreResult` from `runEval` has `taskType: task.type`; `evidence` present on the row iff `task.evidence` is defined
- Does **not** call or change `scoreAnswer`

- [ ] **Step 1: Write the failing tests**

In `packages/harness/src/eval.test.ts`:

1. Extend the existing success test fixture task JSON (in `beforeEach`) **or** add a dedicated test that writes a task with `evidence` and asserts the row.

Add this new test (and keep existing ones):

```ts
  it('sets taskType on success and error rows; echoes evidence when present', async () => {
    await writeFile(
      join(root, 'packs-public-mini', 'tasks', 't002-set.json'),
      JSON.stringify({
        id: 't002',
        type: 'set',
        question: 'List',
        gold: ['http://example.org/ou/alice'],
        evidence: ['mini.ttl#alice'],
      }),
    )

    const ok: Method = {
      id: 'M0',
      name: 'Ok',
      async run(task: Task) {
        return { value: task.gold as string | string[] }
      },
    }
    const boom: Method = {
      id: 'M1',
      name: 'Boom',
      async run() {
        throw new Error('boom')
      },
    }
    const reasoner: Reasoner = { id: 'mock', async complete() { return '' } }

    const results = await runEval({
      packsRoot: root,
      methods: [ok, boom],
      reasoner,
      outDir,
    })

    const okExact = results.find((r) => r.methodId === 'M0' && r.taskId === 't001')
    const okSet = results.find((r) => r.methodId === 'M0' && r.taskId === 't002')
    const errSet = results.find((r) => r.methodId === 'M1' && r.taskId === 't002')

    expect(okExact!.taskType).toBe('exact')
    expect(okExact!.evidence).toBeUndefined()
    expect(okSet!.taskType).toBe('set')
    expect(okSet!.evidence).toEqual(['mini.ttl#alice'])
    expect(errSet!.ok).toBe(false)
    expect(errSet!.taskType).toBe('set')
    expect(errSet!.evidence).toEqual(['mini.ttl#alice'])

    const json = JSON.parse(await readFile(join(outDir, 'latest.json'), 'utf8')) as ScoreResult[]
    const jsonSet = json.find((r) => r.methodId === 'M0' && r.taskId === 't002')
    expect(jsonSet!.taskType).toBe('set')
    expect(jsonSet!.evidence).toEqual(['mini.ttl#alice'])
  })
```

Add to imports if needed:

```ts
import type { Method, Reasoner, Task, ScoreResult } from '@ontology-use/core'
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run packages/harness/src/eval.test.ts
```

Expected: FAIL — `taskType` / `evidence` undefined on rows.

- [ ] **Step 3: Minimal `eval.ts` implementation**

Only change the two `ScoreResult` construction sites in `packages/harness/src/eval.ts`. Success path:

```ts
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
```

Catch path:

```ts
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
```

Do **not** edit `console.error` progress lines or any timeout-related code in other files in this commit.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run packages/harness/src/eval.test.ts
```

Expected: PASS (including prior preview/meta/error tests).

- [ ] **Step 5: Commit**

```bash
git add packages/harness/src/eval.ts packages/harness/src/eval.test.ts
git commit -m "feat(harness): attach taskType and optional evidence on ScoreResult"
```

---

### Task 4: `writeResults` — type-bucket md + summary JSON

**Files:**
- Modify: `packages/harness/src/writeResults.ts`
- Create: `packages/harness/src/writeResults.test.ts`

**Interfaces:**
- Consumes: `ScoreResult.taskType` (rows missing `taskType` — e.g. old disk fixtures — skip for type buckets but still count toward overall `avgScore`)
- Produces:
  - `latest.md` header includes `avgExact` | `avgSet` | `avgFields`; empty bucket cell is exactly `—`
  - `latest.json` still a `ScoreResult[]` (unchanged shape aside from new fields on rows)
  - `latest.summary.json`: array of method summaries with `byType: { exact?: number, set?: number, fields?: number }` (omit keys with no rows)

- [ ] **Step 1: Write the failing unit tests**

Create `packages/harness/src/writeResults.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ScoreResult } from '@ontology-use/core'
import { writeResults } from './writeResults.js'

describe('writeResults type buckets', () => {
  let outDir: string

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'ou-wr-'))
  })

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true })
  })

  it('writes avgExact/avgSet/avgFields; uses em dash when a type has zero rows', async () => {
    const results: ScoreResult[] = [
      { methodId: 'M0', taskId: 'e1', ok: true, score: 1, taskType: 'exact' },
      { methodId: 'M0', taskId: 'e2', ok: true, score: 0.5, taskType: 'exact' },
      { methodId: 'M0', taskId: 's1', ok: true, score: 0.25, taskType: 'set' },
      // no fields rows for M0
      { methodId: 'M1', taskId: 'f1', ok: true, score: 1, taskType: 'fields' },
    ]
    await writeResults(outDir, results)

    const md = await readFile(join(outDir, 'latest.md'), 'utf8')
    expect(md).toContain('avgExact')
    expect(md).toContain('avgSet')
    expect(md).toContain('avgFields')
    // M0: exact avg 0.75, set 0.25, fields —
    expect(md).toMatch(/\| M0 \| 0\.7500 \| 3 \| 0 \| 0\.7500 \| 0\.2500 \| — \|/)
    // M1: only fields
    expect(md).toMatch(/\| M1 \| 1\.0000 \| 1 \| 0 \| — \| — \| 1\.0000 \|/)

    const summary = JSON.parse(
      await readFile(join(outDir, 'latest.summary.json'), 'utf8'),
    ) as Array<{
      methodId: string
      avgScore: number
      byType: { exact?: number; set?: number; fields?: number }
    }>
    const m0 = summary.find((r) => r.methodId === 'M0')!
    expect(m0.byType.exact).toBeCloseTo(0.75)
    expect(m0.byType.set).toBeCloseTo(0.25)
    expect(m0.byType.fields).toBeUndefined()

    const latest = JSON.parse(await readFile(join(outDir, 'latest.json'), 'utf8'))
    expect(Array.isArray(latest)).toBe(true)
    expect(latest[0].taskType).toBe('exact')
  })

  it('skips missing taskType for buckets but still counts overall avg', async () => {
    const results = [
      {
        methodId: 'M0',
        taskId: 'legacy',
        ok: true,
        score: 1,
      },
      {
        methodId: 'M0',
        taskId: 'e1',
        ok: true,
        score: 0,
        taskType: 'exact',
      },
    ] as ScoreResult[]

    await writeResults(outDir, results)
    const md = await readFile(join(outDir, 'latest.md'), 'utf8')
    // overall avg = (1+0)/2 = 0.5; exact bucket only the typed row → 0.0000; set/fields —
    expect(md).toMatch(/\| M0 \| 0\.5000 \| 2 \| 0 \| 0\.0000 \| — \| — \|/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run packages/harness/src/writeResults.test.ts
```

Expected: FAIL — current md header is `| method | avg score | tasks | failures |`; no `latest.summary.json`.

- [ ] **Step 3: Implement `writeResults`**

Replace `packages/harness/src/writeResults.ts` with:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run packages/harness/src/writeResults.test.ts packages/harness/src/eval.test.ts
```

Expected: PASS. If `eval.test.ts` only checks `/avg|average|score/i`, it still matches the new header.

- [ ] **Step 5: Commit**

```bash
git add packages/harness/src/writeResults.ts packages/harness/src/writeResults.test.ts
git commit -m "feat(harness): type-bucket columns in writeResults (+ summary JSON)"
```

---

### Task 5: e2e — assert md type-bucket headers

**Files:**
- Modify: `packages/harness/src/e2e.test.ts`

**Interfaces:**
- Consumes: `writeResults` md header from Task 4; mock eval still ≥16 tasks × 11 methods
- Produces: e2e asserts `avgExact` / `avgSet` / `avgFields` present in `latest.md`

- [ ] **Step 1: Write the failing assertion**

In `packages/harness/src/e2e.test.ts`, after reading `md`, add:

```ts
    expect(md).toContain('avgExact')
    expect(md).toContain('avgSet')
    expect(md).toContain('avgFields')
```

Keep existing pack-id / method-id / length assertions.

- [ ] **Step 2: Run e2e**

```bash
npx vitest run packages/harness/src/e2e.test.ts
```

Expected: PASS once Task 4 is merged on this branch (if run before Task 4 → FAIL missing headers).

- [ ] **Step 3: Commit**

```bash
git add packages/harness/src/e2e.test.ts
git commit -m "test(harness): e2e asserts type-bucket md headers"
```

---

### Task 6: PRODUCT one-liner (+ optional mock results refresh)

**Files:**
- Modify: `PRODUCT.md`
- Optional: regenerate `results/latest.md` (and `results/strict/` if you run strict) via mock eval — **no** MiniMax

**Interfaces:**
- Consumes: shipped type-bucket behavior
- Produces: PRODUCT notes that mock/result tables report per-type averages; evidence is optional provenance and does not affect main score

- [ ] **Step 1: Edit PRODUCT.md**

In the **状态** section (near the 16-task / eval paragraph), add one sentence, for example after the line about default 16 public tasks:

```markdown
结果表按 `exact` / `set` / `fields` 分桶报均分（`avgExact` / `avgSet` / `avgFields`；无该类型任务时为 `—`）；任务可选 `evidence` 仅作 provenance 透传进 JSON，**不**进入 `scoreAnswer` 主分。
```

Do not invent MiniMax numbers; do not claim industrial-park enabled.

- [ ] **Step 2 (optional): Refresh mock results on disk**

```bash
cd /workspace/ontology-use
npm run eval
# optional:
npm run eval:strict
```

Expected: `results/latest.md` header includes the three avg* columns; 176 rows still score 1.0 under mock shortcut. If `results/` is gitignored in part, only commit what the repo already tracks (follow existing `.gitignore`; do not force-add llm runs).

- [ ] **Step 3: Commit**

```bash
git add PRODUCT.md
# only if tracked mock results changed and are meant to be committed:
# git add results/latest.md results/latest.json results/latest.summary.json
git commit -m "docs: note type-bucket eval reporting and optional evidence"
```

---

### Task 7: Verification

**Files:** none (commands only)

**Interfaces:**
- Consumes: Tasks 1–6 complete on `feat/eval-type-bucket-evidence`
- Produces: green `npm test` and mock `npm run eval` with type-bucket headers; 176 rows @ 1.0

- [ ] **Step 1: Full unit/e2e suite**

```bash
cd /workspace/ontology-use
npm test
```

Expected: all vitest suites green (including `writeResults`, `loadPacks`, `eval`, `e2e`, `types`).

- [ ] **Step 2: Mock eval smoke**

```bash
npm run eval
```

Expected:
- Completes without MiniMax
- Writes `results/latest.md` whose header contains `avgExact`, `avgSet`, `avgFields`
- 11 methods × 16 tasks = **176** score rows; mock shortcut scores remain **1.0** overall
- `results/latest.json` is still a JSON array; rows include `taskType`
- `results/latest.summary.json` exists with `byType` objects

- [ ] **Step 3: Confirm scorer untouched**

```bash
git log --oneline main..HEAD
git diff main -- packages/harness/src/score.ts
```

Expected: empty diff for `score.ts`.

- [ ] **Step 4: Do not push**

Do **not** `git push`. Do **not** run `--reasoner=llm`. Hand off branch tip to parent/Yuri/Way for review/merge.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
| --- | --- |
| `ScoreResult.taskType` | Task 1 + 3 |
| `Task.evidence?` + `loadPacks` validation | Task 1 + 2 |
| Echo evidence in result JSON; not scored | Task 3 (+ 4 leaves `latest.json` as row dump) |
| md columns avgExact/avgSet/avgFields; empty = `—` | Task 4 |
| `byType` machine-readable summary | Task 4 → `latest.summary.json` |
| Old rows missing `taskType` skipped for buckets | Task 4 unit test |
| e2e header assert; 16 tasks unchanged | Task 5 |
| PRODUCT one-liner | Task 6 |
| `npm test` + `npm run eval`; no MiniMax / no push / no scoreAnswer change | Task 7 + Global Constraints |
| No new pack tasks / no constraintPass | Global Constraints (no task adds packs) |
| Do not revert timeout commits on main | Task 0 / Global Constraints |

**Placeholder scan:** none — all steps include concrete code, commands, and expected outcomes.

**Type consistency:** `taskType` / `evidence` names match across `types.ts`, `eval.ts`, `writeResults.ts`, and tests; empty bucket sentinel is the Unicode em dash `—` (U+2014) everywhere.

**Spec nuance:** Design’s `ScoreResult` code block omitted `evidence`, but §2/§3 require JSON echo; this plan adds `ScoreResult.evidence?` filled in `eval.ts` so `writeResults` can keep stringifying the results array without a task join (Approach A, YAGNI).
