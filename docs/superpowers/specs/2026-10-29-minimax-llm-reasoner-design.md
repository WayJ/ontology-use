# MiniMax LLM Reasoner Design

**Date:** 2026-10-29  
**Status:** Approved (Way: MiniMax 国内站 + 自动推进)  
**Repo:** `/workspace/ontology-use`

## Goal

Replace the phase-1 LLM stub with a real MiniMax (China) chat reasoner so `npm run eval -- --reasoner=llm` produces a **separate** score table under `results/llm-<runid>/`, without touching default mock `results/` or `results/strict/`.

## Non-goals

- Ranking methods from mock-shortcut tables
- Enabling industrial-park pack by default
- Multi-provider abstraction beyond env-configured base URL / model
- Streaming, tools, or vision

## Provider (locked)

| Field | Value |
| --- | --- |
| Platform | https://platform.minimax.cn |
| Protocol | OpenAI-compatible `POST /v1/chat/completions` |
| Default base URL | `https://api.minimax.cn/v1` |
| Default model | `MiniMax-M3.1-Flash` |
| Auth | `Authorization: Bearer $MINIMAX_API_KEY` |
| Env | `MINIMAX_API_KEY` (required); `MINIMAX_BASE_URL` (optional); `MINIMAX_MODEL` (optional) |

Verified 2026-10-29: key present, HTTP 200 from `api.minimax.cn`.

## Architecture

1. `@ontology-use/reasoners-llm` exports `createLlmReasoner(opts?)` that implements `Reasoner`:
   - `id: 'llm'`
   - `complete(prompt)` → HTTP chat completion; returns assistant **text** (`message.content`). If `content` empty but `reasoning_content` present, do **not** treat reasoning as the answer (methods expect task JSON/text); throw a clear error asking for higher `max_completion_tokens` / empty-content.
2. Use native `fetch` (Node 22); no `openai` SDK dependency required (YAGNI). Optional: thin typed request/response helpers in the same package.
3. Harness wiring:
   - `assertReasonerRunnable('llm')` succeeds only when `MINIMAX_API_KEY` is non-empty; otherwise clear error (no phase-1 stub message).
   - `createReasoner('llm')` builds the live reasoner.
   - CLI: if `--reasoner=llm` and `--out` omitted, default `results/llm-<ISO-ish-runid>/` (never `results/` or `results/strict/`).
   - Record run metadata in `latest.json` (or sibling `meta.json`): model, baseURL host (not key), timestamp, token usage totals if available.
4. Methods: unchanged; they already skip mock-shortcut when `reasoner.id !== 'mock'`.
5. **Concurrency hard cap:** MiniMax concurrent `complete()` calls must never exceed **5** (user constraint). Current `runEval` is strictly sequential (nested `for` + `await`) so live concurrency is 1. Do not introduce `Promise.all` over methods/tasks without a semaphore ≤5. Record `maxConcurrency: 5` in `meta.json`.
6. Cost / usage: sum `usage.prompt_tokens` / `completion_tokens` / `total_tokens` across calls when present; write into run meta. No billing API.

## Error handling

- Missing key → exit 1 before eval, message names `MINIMAX_API_KEY`.
- HTTP non-2xx → throw with status + truncated body (never log the key).
- Empty `content` → throw (do not score empty answers as valid completions).
- Network errors → throw; harness already records per-task failures.

## Testing

- Unit: `createLlmReasoner` with mocked `fetch` (success, non-2xx, empty content, missing key at factory or assert).
- CLI: `--reasoner=llm` without key still exits 1 with key message; with key + mocked fetch optional.
- Keep mock eval / strict eval tests green and **unchanged** snapshot dirs.
- Live smoke (manual / gated): one `complete('ping')` when `MINIMAX_API_KEY` set; full matrix only when explicitly running eval.

## Success criteria

1. `npm test` passes (update LLM stub tests to match new behavior).
2. `npm run eval` still writes mock shortcut table to `results/` unchanged behavior.
3. `npm run eval -- --reasoner=llm` writes ≥1 score rows under `results/llm-*/` and exits 0 when API works.
4. Paper / PRODUCT note: LLM table path cited; mock tables still labeled non-ranking.
5. No API key in git, logs, or committed results.

## Approaches considered

1. **OpenAI-compatible fetch adapter (chosen)** — minimal deps, matches MiniMax CN docs.
2. Official `openai` SDK — heavier; same endpoint; deferred.
3. Anthropic-compatible MiniMax endpoint — also supported by MiniMax; unnecessary for `complete(prompt)` string API.
