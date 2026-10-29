# ontology-use

Research eval harness: run methods **M0–M10** on public OWL/RDF task packs with a default **mock reasoner** (deterministic, zero network). Optional real LLM is phase 2.

**Not an SDK/MCP product.** Deliverables: benchmark + method matrix + [Chinese paper skeleton](docs/paper/README.md).

## Requirements

- Node.js ≥ 20 (22 recommended)

## Quick start

```bash
npm i
npm test
npm run eval          # mock gold shortcut (pipeline smoke) → results/latest.md
npm run eval:strict   # strictMock: no shortcut → results/strict/latest.md
```

Paper experiments must cite only those result files; see [docs/paper/04-experiments.md](docs/paper/04-experiments.md).

## Layout

- `packages/core` — shared types
- `packages/reasoners-mock` — deterministic reasoner
- `packages/packs-public-mini` — default-enabled mini pack (exact/set/fields)
- `packages/methods` — M0–M10 runners
- `packages/harness` — load → run → score → write
- `docs/paper/` — Chinese paper skeleton

Industrial-park ontology packs stay `enabled: false` and are not in the default eval.

`ontologyRefs` in task JSON are resolved relative to the pack directory when loaded.

## CLI

```bash
npm run eval
npm run eval:strict
npm run eval -w @ontology-use/harness -- --packs ./packages --out ./results
npm run eval -w @ontology-use/harness -- --strict-mock --out ./results/strict
npm run eval -w @ontology-use/harness -- --reasoner=llm  # phase 1: errors out
```

## License

Research fixture content in `packages/packs-public-mini` is CC0-1.0; see pack `attribution.md`.
