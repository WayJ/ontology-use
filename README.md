# ontology-use

Research eval harness: run methods **M0–M10** on public OWL/RDF task packs with a default **mock reasoner** (deterministic, zero network). Optional real LLM via MiniMax CN (`--reasoner=llm`).

**Not an SDK/MCP product.** Deliverables: benchmark + method matrix + [Chinese paper skeleton](docs/paper/README.md).

## Requirements

- Node.js ≥ 20 (22 recommended)

## Quick start

```bash
npm i
npm test
npm run eval          # --reasoner=mock (default); mock-shortcut smoke → results/latest.md
npm run eval:strict   # strictMock: no shortcut → results/strict/latest.md
# LLM (MiniMax CN): export MINIMAX_API_KEY=... then
npm run eval -- --reasoner=llm   # → results/llm-<stamp>/{latest.md,latest.json,meta.json}
```

Paper experiments must cite only on-disk result files; see [docs/paper/04-experiments.md](docs/paper/04-experiments.md). LLM score blobs are gitignored — reproduce locally.

## Reasoners

| Flag | Behavior |
|------|----------|
| `--reasoner=mock` (default) | Deterministic mock; used by `npm run eval` |
| `--reasoner=llm` | MiniMax CN OpenAI-compatible (`MINIMAX_API_KEY` required). Default model `MiniMax-M3.1-Flash`, base `https://api.minimax.cn/v1`. Writes `results/llm-<stamp>/` only (never default `results/`). Hard cap `maxConcurrency: 5` (eval is sequential today). |

```bash
export MINIMAX_API_KEY=...   # never commit
npm run eval -- --reasoner=llm
```

## Layout

- `packages/core` — shared types
- `packages/reasoners-mock` — deterministic reasoner
- `packages/reasoners-llm` — MiniMax CN chat reasoner (`createLlmReasoner`)
- `packages/packs-public-mini` — default-enabled mini pack
- `packages/packs-public-foaf-lite` — FOAF-inspired lite pack (enabled)
- `packages/packs-industrial-park` — optional add-on (`enabled: false`, not in default eval)
- `packages/methods` — M0–M10 runners
- `packages/harness` — load → run → score → write
- `docs/paper/` — Chinese paper skeleton

`ontologyRefs` in task JSON are resolved relative to the pack directory when loaded.

## CLI

```bash
npm run eval
npm run eval:strict
npm run eval -w @ontology-use/harness -- --packs ./packages --out ./results
npm run eval -w @ontology-use/harness -- --strict-mock --out ./results/strict
npm run eval -w @ontology-use/harness -- --reasoner=llm  # needs MINIMAX_API_KEY; results/llm-*/
```

## License

Research fixture content in `packages/packs-public-mini` is CC0-1.0; see pack `attribution.md`.
