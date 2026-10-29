# ontology-use

Research eval harness: run methods **M0–M10** on public OWL/RDF task packs with a default **mock reasoner** (deterministic, zero network). Optional real LLM is phase 2.

## Requirements

- Node.js ≥ 20 (22 recommended)

## Quick start

```bash
npm i
npm test
npm run eval          # mock gold shortcut (pipeline smoke)
npm run eval:strict   # strictMock: no shortcut; writes results/strict/
```

Then open:

- `results/latest.md` — default eval table
- `results/latest.json` — raw `ScoreResult` rows
- `results/strict/latest.md` — strict-mock eval table

## Layout

- `packages/core` — shared types
- `packages/reasoners-mock` — deterministic reasoner
- `packages/packs-public-mini` — default-enabled mini pack (exact/set/fields)
- `packages/methods` — M0–M10 runners
- `packages/harness` — load → run → score → write

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
