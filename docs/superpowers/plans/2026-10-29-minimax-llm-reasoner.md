# MiniMax LLM Reasoner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live MiniMax (CN) LLM reasoner behind `--reasoner=llm`, writing scores only under `results/llm-<runid>/`.

**Architecture:** Replace phase-1 stub in `@ontology-use/reasoners-llm` with OpenAI-compatible `fetch` to `https://api.minimax.cn/v1/chat/completions`; harness asserts key, defaults llm outDir away from mock paths; record usage meta.

**Tech Stack:** TypeScript, Node 22 `fetch`, vitest, existing npm workspaces.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-29-minimax-llm-reasoner-design.md`
- Never commit or print `MINIMAX_API_KEY`
- Default mock `results/` and `results/strict/` behavior unchanged
- No `openai` package unless unavoidable
- Default model `MiniMax-M3.1-Flash`; base `https://api.minimax.cn/v1`
- Empty `message.content` is an error (ignore `reasoning_content` as answer)
- TDD: failing test → implement → pass → commit per task
- Work in `/workspace/ontology-use` on `main` (local-only repo, no remote)

---

### Task 1: Live createLlmReasoner (fetch)

**Files:**
- Modify: `packages/reasoners-llm/src/index.ts`
- Modify: `packages/reasoners-llm/src/index.test.ts`
- Create (optional helper): `packages/reasoners-llm/src/minimaxClient.ts`

**Interfaces:**
- Consumes: `Reasoner` from `@ontology-use/core`
- Produces: `createLlmReasoner(opts?: { apiKey?: string; baseUrl?: string; model?: string; fetchImpl?: typeof fetch; maxCompletionTokens?: number }): Reasoner`
- Env fallbacks: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`
- Export `LLM_MISSING_KEY_MESSAGE = 'MINIMAX_API_KEY is required for --reasoner=llm'`
- Remove / stop exporting phase-1-only throw-on-complete as the default path; keep a named constant only if tests need migration clarity

- [ ] **Step 1: Rewrite failing tests** in `index.test.ts`:
  - missing key → `createLlmReasoner({ apiKey: '' })` throws `LLM_MISSING_KEY_MESSAGE` (or complete rejects — pick factory throw)
  - mocked fetch 200 with `choices[0].message.content = 'ok'` → `complete('hi')` returns `'ok'`
  - mocked fetch 200 with empty content → rejects
  - mocked fetch 401 → rejects including status
  - request URL is `${baseUrl}/chat/completions`, Authorization Bearer, body model + messages `[{role:'user',content:prompt}]`

- [ ] **Step 2: Run** `npx vitest run packages/reasoners-llm` — expect FAIL

- [ ] **Step 3: Implement** fetch-based reasoner; accumulate optional `usage` on reasoner if easy (`getUsage(): { prompt_tokens, completion_tokens, total_tokens }` or expose via `meta` later). Prefer attaching `reasoner` with optional `usageTotals` mutable object returned from factory via `createLlmReasoner` return type still `Reasoner` — store totals on a side object exported from a `createLlmReasonerWithMeta()` OR write usage only in harness Task 2. **YAGNI for Task 1:** just return content string; usage parsing can live in same file as `lastUsage` module field or method `getLastUsage()` on a branded object. Simplest: return `Reasoner & { getUsageTotals(): {...} }` and harness casts when id==='llm'.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit** `feat(reasoners-llm): MiniMax OpenAI-compatible complete()`

---

### Task 2: Harness CLI — key gate + llm outDir

**Files:**
- Modify: `packages/harness/src/createReasoner.ts`
- Modify: `packages/harness/src/createReasoner.test.ts`
- Modify: `packages/harness/src/cli.ts`
- Modify: `packages/harness/src/cli.llm.test.ts`
- Modify: `packages/harness/src/eval.ts` (if needed for meta.json)
- Modify: root `package.json` scripts only if adding `eval:llm`

**Interfaces:**
- `assertReasonerRunnable('llm')` checks `process.env.MINIMAX_API_KEY`; throws `LLM_MISSING_KEY_MESSAGE` if missing
- `createReasoner('llm')` → `createLlmReasoner()`
- CLI default outDir when reasoner=llm and `--out` omitted: `results/llm-<YYYYMMDDTHHMMSS>/` under repo root
- After eval for llm: write `meta.json` beside `latest.json` with `{ provider:'minimax', baseUrl, model, startedAt, usageTotals? }` — **no key**

- [ ] **Step 1: Failing tests** — assert runnable with env unset throws missing-key; with env set does not throw; createReasoner returns id llm; CLI parse/default out path contains `results/llm-` (extract `parseArgs` for testability if not already)

- [ ] **Step 2: Run harness tests — FAIL**

- [ ] **Step 3: Implement** wiring + meta.json write (extend `runEval` opts with optional `runMeta` or write from cli after runEval)

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat(harness): enable --reasoner=llm with MiniMax key and isolated outDir`

---

### Task 3: Live smoke + full llm eval

**Files:**
- May create: `results/llm-*/latest.{md,json}` and `meta.json` (git: decide — prefer gitignore `results/llm-*` OR commit one snapshot; **prefer add `results/llm-*/` to .gitignore** and document how to reproduce; update paper to say "run locally, do not invent numbers")
- Modify: `docs/paper/04-experiments.md`, `06-conclusion.md`, `PRODUCT.md`, README briefly
- Modify: `.gitignore` if needed

- [ ] **Step 1:** Confirm `.gitignore` ignores `results/llm-*/` (or whole results except committed mock/strict snapshots — inspect current ignore rules)

- [ ] **Step 2:** Live smoke: `node`/`tsx` one-liner calling `createLlmReasoner().complete('Reply with exactly: pong')` — expect content includes pong; do not print key

- [ ] **Step 3:** Run full matrix: `npm run eval -- --reasoner=llm` (ensure root forwards args). Confirm exit 0, row count 88, out under `results/llm-*`

- [ ] **Step 4:** Update paper experiments section: add subsection "LLM run (MiniMax CN)" stating model + that numbers live only on disk after local run; **if** you have real scores, cite them from the file you just wrote; never invent. PRODUCT/README: how to run llm eval.

- [ ] **Step 5:** `npm test` full green; `npm run eval` mock still 88×1.0 shortcut

- [ ] **Step 6: Commit** docs + gitignore only (not llm result blobs unless intentionally snapshotting — default: do not commit llm result files)

---

## Self-review

- Spec coverage: provider, env, outDir isolation, empty content, tests, paper caution — Tasks 1–3
- No placeholders in steps
- Types: `Reasoner.complete(prompt: string): Promise<string>` unchanged
