# ontology-use

Research eval harness: run methods **M0–M10** on public OWL/RDF task packs with a default **mock reasoner** (deterministic, zero network). Optional real LLM is phase 2.

**Not an SDK/MCP product.** Deliverables: benchmark + method matrix + [Chinese paper skeleton](docs/paper/README.md).

## Requirements

- Node.js ≥ 20 (22 recommended)

## Quick start

```bash
npm i
npm test
npm run eval          # --reasoner=mock (default); mock-shortcut smoke → results/latest.md
npm run eval:strict   # strictMock: no shortcut → results/strict/latest.md
```

Paper experiments must cite only those result files; see [docs/paper/04-experiments.md](docs/paper/04-experiments.md).

## Reasoners

| Flag | Behavior |
|------|----------|
| `--reasoner=mock` (default) | Deterministic mock; used by `npm run eval` |
| `--reasoner=llm` | **Phase 1:** exits non-zero with `LLM reasoner not implemented in phase 1; set fixtures or use mock` **before** writing any `results/` files |

```bash
npm run eval -w @ontology-use/harness -- --reasoner=llm   # must fail; no polluted latest.*
```

## Layout

- `packages/core` — shared types
- `packages/reasoners-mock` — deterministic reasoner
- `packages/reasoners-llm` — phase-1 stub (throws on `complete`)
- `packages/packs-public-mini` — default-enabled mini pack
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
npm run eval -w @ontology-use/harness -- --reasoner=llm  # exits 1; clear error; no write
```

## License

Research fixture content in `packages/packs-public-mini` is CC0-1.0; see pack `attribution.md`.
