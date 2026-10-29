# Industrial park pack (add-on)

This pack is an **optional add-on** and ships with `"enabled": false`.

It is **not** included in the default `npm run eval` / `npm run eval:strict` runs.
`loadEnabledPacks` skips any pack whose manifest has `enabled: false`.

## Placeholder only

Do **not** commit large proprietary ontology dumps here. Keep this stub tiny.

If a local industrial ontology tree exists (e.g. under `/workspace/industrial-park-ontology`),
you may later drop **small, sanitized** OWL/RDF excerpts into `ontology/` and real tasks into
`tasks/`, then flip `enabled` to `true` for a private eval run with `--packs` pointing at a
copy or overlay. Prefer generating a separate results directory so default `results/latest.*`
stay public-mini only.
