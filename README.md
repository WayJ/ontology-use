# ontology-use

Research eval harness: run methods **M0–M10** on public OWL/RDF task packs with a default **mock reasoner** (deterministic, zero network). Optional real LLM is phase 2.

## Requirements

- Node.js ≥ 20 (22 recommended)

## Quick start

```bash
npm i
npm test
npm run eval
```

Then open:

- `results/latest.md` — method × metrics table
- `results/latest.json` — raw `ScoreResult` rows

## Layout

- `packages/core` — shared types
- `packages/reasoners-mock` — deterministic reasoner
- `packages/packs-public-mini` — default-enabled mini pack
- `packages/methods` — M0–M10 runners
- `packages/harness` — load → run → score → write

Industrial-park ontology packs stay `enabled: false` and are not in the default eval.

## CLI

```bash
npm run eval
# or
npm run eval -w @ontology-use/harness -- --packs ./packages --out ./results
npm run eval -w @ontology-use/harness -- --strict-mock   # no mock gold shortcut
npm run eval -w @ontology-use/harness -- --reasoner=llm  # phase 1: errors out
```

## License

Research fixture content in `packages/packs-public-mini` is CC0-1.0; see pack `attribution.md`.
