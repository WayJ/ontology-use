# LLM Prompt / IRI Tune Design (Approach C)

**Date:** 2026-10-29  
**Status:** Approved (Way: Approach C — output contract + IRI alignment + empty-content mitigation + answer preview)  
**Repo:** `/workspace/ontology-use`  
**Prior art:** `docs/superpowers/specs/2026-10-29-minimax-llm-reasoner-design.md`  
**Evidence:** `/tmp/sdd-minimax/tune-diagnosis.md` against `results/llm-20261029T222608/`

## Problem

Live MiniMax matrix (`llm-20261029T222608`, 11 methods × 8 tasks = 88 rows):

| Bucket | Count | Meaning |
| --- | ---: | --- |
| score = 1 | **5** | all `foaf-t001` / gold `"Alice"` only |
| silent-zero | **65** | `ok=false`, `score=0`, no `error` — Answer returned, scorer rejected |
| empty-content | **17** | reasoner threw; harness recorded `error` |
| fetch-failed | **1** | network |

Root causes (ranked by evidence in the diagnosis):

1. **Gold expanded IRIs vs prefixed TTL.** Pack gold uses full `http://example.org/ou/...` / `http://example.org/foaf-lite/...`; ontology files only contain `ou:` / `fl:` compact forms. Scorers are exact (after trim/case). A correct compact answer scores 0.
2. **No output format in method prompts.** No method asks for “single string only”, JSON array, or `{action, objectIds}`. `parseReasonerOutput` fallbacks (`[prose]`, `{value: prose}`) systematically miss set/fields gold → silent zeros.
3. **Thinking empties `message.content`.** Default `max_completion_tokens=2048`; completion≫prompt; 17 throws with the existing empty-content message. Spec and tests already forbid treating `reasoning_content` as the answer.

Evidence gap: `ScoreResult` / `latest.json` store only `{methodId, taskId, ok, score, error?}` — no answer preview — so silent zeros cannot be split into parse vs semantic from disk alone.

## Goals

Raise **live** `--reasoner=llm` scores via:

1. **Output contract** — task-type-aware prompt footer + hardened parse.
2. **IRI alignment** — compact ↔ expanded normalize before score.
3. **Empty-content mitigation** — higher default completion budget + optional `finish_reason` observability; still reject empty `content`.
4. **Answer preview** — persist truncated `answer.value` (and raw length) on llm result rows for diagnosis.

Constraints carried forward:

- MiniMax China only (`api.minimax.cn`, model default `MiniMax-M3.1-Flash`).
- Concurrency ≤ 5 (`maxConcurrency: 5` in meta; `runEval` stays sequential unless a semaphore ≤5 is added later).
- Never print or commit API keys.
- LLM result trees under `results/llm-*` stay gitignored.
- Do not invent eval numbers for the paper; paper cites disk tables only.
- Default mock eval must remain **88 × 1.0** (gold shortcut unchanged).

## Non-goals

- Retuning paper claims from thin air / inventing score tables.
- Changing the mock gold shortcut (`shouldShortcut` when `reasoner.id === 'mock'` && not strict).
- Treating `reasoning_content` as the scored answer.
- Enabling industrial-park pack by default.
- CloudAgent publish, new packs, Pi / Computer Use.
- Multi-provider abstraction beyond existing env knobs.
- Changing gold files to compact forms (alignment is runtime normalize, not pack rewrite).

## Design — Approach C

### 1. Output contract (methods)

Add a **shared prompt footer** helper (e.g. `outputContractFooter(task: Task): string` in `packages/methods/src/shared.ts`) and append it from every method’s `buildPrompt` path that already goes through `runWithPrompt` / M10’s equivalent. Footer text is English (code/docs language of the repo).

| `task.type` | Footer contract |
| --- | --- |
| `exact` | Reply with the answer as a **single plain string only**. No JSON, no markdown fences, no explanation. |
| `set` | Reply with a **JSON array of strings only** (e.g. `["http://…","http://…"]`). No prose, no markdown fences. |
| `fields` | Reply with a **JSON object only** whose keys are exactly the required field names. Derive required keys from `Object.keys(task.gold)` when gold is an object (current packs use `action` / `objectIds`). No prose, no markdown fences. |

Rules:

- Footer is appended for **all** reasoners that do not take the mock shortcut (i.e. live llm and strict-mock paths that call `complete`). Mock shortcut never sees the footer and still returns gold shaped values.
- Do not invent field names; keys come from gold (or an explicit schema field if one is added later — YAGNI: gold keys are enough for current packs).
- Compact or expanded IRIs are both acceptable in the model’s reply; IRI normalize (below) makes them comparable.

### 2. Harden `parseReasonerOutput`

In `packages/methods/src/shared.ts`:

1. **Strip markdown fences** before parse: if trimmed text matches a \`\`\` / \`\`\`json fenced block, use the inner body.
2. Prefer `JSON.parse` for `set` and `fields` (unchanged success path).
3. Keep existing fallbacks for non-JSON (`set` → one-element array; `fields` → `{ value: trimmed }`) so behavior stays predictable, but the contract should make fallbacks rare.
4. For `exact`, after fence-strip, if the body is a JSON string literal, unwrap once (`JSON.parse` → string); otherwise use trimmed text. Do not unwrap objects/arrays into exact strings.

No second LLM call / retry in this tune.

### 3. IRI alignment (chosen rule)

**Rule: canonicalize both gold strings and prediction strings to expanded IRI form before exact/set/fields string compares. Scorers stay exact after normalize.**

Implementation sketch (names illustrative):

1. `parsePrefixMap(ontologyText: string): Record<string, string>`  
   - Parse Turtle `@prefix pfx: <iri> .` lines from ontology text(s) attached to the task.  
   - Always merge known pack defaults: `ou:` → `http://example.org/ou/`, `fl:` → `http://example.org/foaf-lite/` (so normalize works even when a method prompt omitted ontology body).
2. `expandCompactIri(s: string, map): string`  
   - If `s` matches `^([A-Za-z_][\w-]*):(\S+)$` and the prefix is in the map, return `map[prefix] + local`.  
   - Else return `s` unchanged (already expanded, literals like `"Alice"`, action names like `Introduce` / `AssignWorksAt`).
3. Apply expand to every string involved in scoring: exact gold/pred; each set element; each fields value (keys unchanged).

Where to hook:

- Prefer a small helper used **inside** `scoreAnswer` (or immediately before it in `runEval`) so every method benefits without per-method edits.  
- Prefix map source: `readOntologyText(task)` when available; fall back to known defaults. Harness may need the ontology text or a prebuilt map passed in — keep the API minimal (e.g. `scoreAnswer(task, answer, prefixMap?)` with defaults filled by harness from pack ontology files).

**Not chosen:** expand-only-in-parse. That would leave gold/pred asymmetric if parse ever skipped expansion, and would not help answers that bypass parse enrich paths. Dual-side expand-before-score is the single clear rule.

Scorers (`scoreExact` / `scoreSet` / `scoreFields`) keep trim+case normalize **after** IRI expand. No fuzzy IRI matching, no OWL reasoning.

### 4. Empty-content mitigation (reasoners-llm)

| Change | Detail |
| --- | --- |
| Default `max_completion_tokens` | Raise from **2048 → 4096** in `createLlmReasoner` default. Keep override via `opts.maxCompletionTokens` and/or env `MINIMAX_MAX_COMPLETION_TOKENS` (document in package README / eval notes). Update the unit test that asserts the default. |
| Empty `content` | **Still throw** with the existing message; **never** score `reasoning_content` as the answer (prior design + tests stay binding). |
| Observability | When the HTTP JSON includes `choices[0].finish_reason`, attach it to the thrown error message (truncated) and/or to per-call meta if answer preview plumbing already carries meta — do not invent fields MiniMax does not return. |
| Non-thinking API knob | **Do not invent** request fields. If a MiniMax “disable thinking” / budget parameter is later verified against live docs or a successful probe, add it behind an env flag with a code comment citing the verification date. Until then: `# TODO(research): MiniMax non-thinking / reasoning budget knob — unverified; do not invent API fields.` |

Concurrency and auth unchanged from the MiniMax reasoner design.

### 5. Answer preview (harness / core)

Extend `ScoreResult` in `packages/core/src/types.ts`:

```ts
export type ScoreResult = {
  methodId: MethodId
  taskId: string
  ok: boolean
  score: number
  error?: string
  /** Truncated JSON/string preview of answer.value; llm runs only / optional */
  answerPreview?: string
  /** Length of raw reasoner completion when available */
  rawLength?: number
}
```

Wiring:

- In `runEval`, on success path after `method.run`, set `answerPreview` to a truncated serialization of `answer.value` (e.g. `JSON.stringify` then slice to ≤ 200 chars; append `…` if truncated).
- Set `rawLength` from `answer.meta` if methods stash raw length, or from a thin convention (`meta.rawLength`) filled in `runWithPrompt` as `raw.length`. Prefer this over bloating every row with full prompts.
- On throw path, leave preview empty; keep `error`.
- `writeResults` persists the new optional fields into `latest.json` unchanged for markdown summary (table stays method averages; no need to dump previews into `latest.md`).
- Gitignore already covers `results/**/*.json` and `results/llm-*`; do not commit live scores.
- Mock eval may omit preview (optional fields) or include them — either is fine as long as scores remain 88×1.0.

### 6. Retrieval light touch (secondary, in-scope if cheap)

`questionTokens` splits on `[^a-z0-9:/.]+`, which breaks `foaf-lite` in IRIs (`foaf` + `lite/...`). **In this tune, if it fits one focused change:** treat hyphen as allowed inside tokens **or** add local-name fallbacks (`alice`, `Person`) when matching lines. Document in the implementation plan as a single optional commit under Approach C; if it risks scope creep past contract+IRI+empty+preview, **defer** to a follow-up and leave a one-line “Deferred” note in the plan — do not block the primary four items.

## Package touch map

| Area | Package / file (expected) |
| --- | --- |
| Output footer + parse harden + optional token fix | `packages/methods/src/shared.ts` (+ method call sites if footer not centralized in `runWithPrompt`) |
| IRI expand + score hook | `packages/harness/src/score.ts` and/or `eval.ts`; small util colocated or in `methods`/`core` |
| max_completion_tokens + finish_reason in errors | `packages/reasoners-llm/src/index.ts` (+ tests) |
| ScoreResult + writeResults | `packages/core/src/types.ts`, `packages/harness/src/writeResults.ts`, `eval.ts` |
| Docs / eval notes | English notes under `docs/` as needed; paper still cites disk llm tables only |
| Mock shortcut | **untouched** logic |

## Testing

1. **Unit — parse:** fence strip; exact plain / JSON-string unwrap; set JSON array; fields JSON object with gold keys; fallbacks still behave.
2. **Unit — IRI normalize:** `ou:Person` ↔ `http://example.org/ou/Person`; `fl:alice` ↔ `http://example.org/foaf-lite/alice`; literals/`Introduce` unchanged; unknown prefix left as-is.
3. **Unit — score after normalize:** exact/set/fields score 1 when pred is compact and gold is expanded (and vice versa if ever needed).
4. **Unit — reasoner:** default `max_completion_tokens` is 4096; empty content still rejected even when `reasoning_content` present; override still works.
5. **Unit / integration — preview:** llm-path (or mocked runEval) rows include truncated `answerPreview` when an Answer exists.
6. **Mock eval:** `npm run eval` (default mock) still **88 × 1.0**; do not regress `results/` mock behavior or strict mock semantics.
7. **Live llm (manual / gated):** re-run `npm run eval -- --reasoner=llm` → new `results/llm-<stamp>/` (gitignored). Compare empty-content count vs 17 and whether non-Alice IRI/set/fields tasks can score >0. **Do not commit** the live table; paper continues to cite disk paths only.

## Success criteria

1. Mock default eval unchanged at **88 × score 1.0**.
2. On a comparable live MiniMax run (same model family, concurrency ≤5, China endpoint): **empty-content count < 17**.
3. Non-Alice tasks whose gold is expanded IRIs (or set/fields of IRIs) can score **> 0** when the model returns correct **compact or expanded** values under the new contract.
4. `results/llm-*/latest.json` rows include **answer preview** (when Answer present) so silent zeros are diagnosable.
5. No API key in logs, git, or committed artifacts; llm results remain gitignored.
6. Paper / PRODUCT notes do not invent numbers; they point at on-disk llm result dirs only.

## Out of scope

- CloudAgent publish / remote CI publish of scores  
- New ontology packs or industrial-park enablement  
- Pi / Computer Use / browser agents  
- Changing gold JSON files to compact IRIs  
- Using `reasoning_content` as answers  
- Inventing MiniMax request parameters not verified against the API  

## Approaches considered

1. **A — Prompt/parse only** — Rejected as sole fix: IRI mismatch would keep most rows at 0 even with perfect JSON shape.
2. **B — Reasoner tokens / thinking only** — Rejected as sole fix: reduces empty-content but not the 65 silent zeros.
3. **C — Contract + IRI normalize + empty mitigation + preview (chosen)** — Addresses all three measured failure modes plus the observability gap; mock shortcut untouched.

## Self-review notes

- No TBD left on the IRI rule: **expand both sides before score**.  
- No invented MiniMax “disable thinking” field; research TODO only.  
- Answer preview is optional on the type and truncated — avoids committing huge prompts while closing the diagnosis gap.  
- Retrieval hyphen fix is explicitly secondary / deferrable so it cannot block C.  
- Numbers cited above are from `llm-20261029T222608` diagnosis only; future runs must be measured, not assumed.
