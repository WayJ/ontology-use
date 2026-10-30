# Public Pack Expand Design (Approach C + ~16 tasks)

**Date:** 2026-10-30  
**Status:** Approved (Way via Yuri: C = grow existing + new pack; ~16 tasks; split = mini+2 / foaf+2 / org-lite+4; industrial park stays `enabled:false`)  
**Repo:** `/workspace/ontology-use`  
**Prior art:** packs `public-mini` (5), `public-foaf-lite` (3); harness `loadPacks`; paper §4.5

## Problem

Default scorable surface is only **8** tasks (11 methods × 8 = 88 rows). Statistical contrast across M0–M10 is thin. Paper §4.5 and PRODUCT call for a larger public pack while keeping industrial-park off by default and all IRIs on `example.org`.

## Goals

1. Grow default-enabled public tasks from **8 → 16**.
2. Keep industrial-park **`enabled: false`**.
3. All ontology IRIs under `http://example.org/…` (no real FOAF/Schema.org namespaces in gold or TTL).
4. Preserve mock shortcut: default `npm run eval` → **176** rows all score **1.0**.
5. No live MiniMax re-run in this change; no remote push; paper cites only disk-checkable pack/task counts (no invented LLM scores).

## Non-goals

- Enabling industrial-park.
- Changing scorers, reasoners, or output-contract/IRI expand logic (already on `main`).
- Live LLM eval or paper LLM table rewrite.
- Publishing Origin/GitHub remotes.
- Hyphen / retrieval deferred items from prior tune notes.

## Approach (locked)

| Pack | Delta | Resulting task count |
| --- | ---: | ---: |
| `public-mini` | +2 | 7 |
| `public-foaf-lite` | +2 | 5 |
| **new** `public-org-lite` | +4 | 4 |
| **Total** | **+8** | **16** |

## Design

### 1. Extend `public-mini`

Ontology (`ontology/mini.ttl`): add only what new tasks need, e.g.:

- Optional third person or property if required by gold (prefer reuse `ou:alice` / `ou:bob` / `ou:Acme` / `ou:worksAt` when possible).
- Candidate additions: a datatype property (e.g. `ou:label`-style already via `rdfs:label`) or a second organization / worksAt edge for a non-trivial set question.

Tasks (ids continue `t006`, `t007`):

| id | type | Intent (illustrative; gold must match TTL) |
| --- | --- | --- |
| t006 | exact | Class or literal answer grounded in mini TTL (not duplicating t001/t004) |
| t007 | set | Set of IRIs grounded in mini TTL (not duplicating t002/t005) |

Attribution / README: note synthetic `example.org` data; no license claim on external ontologies.

### 2. Extend `public-foaf-lite`

Ontology: extend `foaf-lite.ttl` only as needed (e.g. another `fl:knows` edge or name query).

Tasks (`foaf-t004`, `foaf-t005`):

| id | type | Intent |
| --- | --- | --- |
| foaf-t004 | exact or set | Name / knows / Person listing not covered by t001–t003 |
| foaf-t005 | fields or set | Second ActionSDK-style or set question; if fields, gold keys remain `action` + `objectIds` |

Keep prefix `fl:` → `http://example.org/foaf-lite/`.

### 3. New pack `packages/packs-public-org-lite`

Mirror foaf-lite package shape:

```
packages/packs-public-org-lite/
  package.json          # @ontology-use/packs-public-org-lite
  manifest.json         # id: public-org-lite, enabled: true
  attribution.md
  README.md
  ontology/org-lite.ttl
  tasks/org-t001-exact.json
  tasks/org-t002-set.json
  tasks/org-t003-fields.json
  tasks/org-t004-*.json   # exact or set (fourth task)
```

Ontology sketch (compact in TTL; gold uses **expanded** IRIs like existing packs):

- `@prefix ol: <http://example.org/org-lite/> .`
- Classes: `ol:Organization`, `ol:Employee`, `ol:Role` (minimal).
- Properties: e.g. `ol:memberOf`, `ol:holdsRole`, `ol:name` (datatype).
- Individuals: small cast (org + 2–3 employees + 1–2 roles) so set/exact/fields are unambiguous.

Tasks:

| id | type | Intent |
| --- | --- | --- |
| org-t001 | exact | e.g. class of an employee / name literal |
| org-t002 | set | e.g. members of an org / holders of a role |
| org-t003 | fields | ActionSDK-style gold `{ action, objectIds }` with comma-joined expanded IRIs |
| org-t004 | exact or set | One more grounded query (prefer set if org-t001 is exact) |

### 4. Harness / prefixes / wiring

- `loadPacks` already scans `packages/*` with `manifest.enabled`; no loader API change expected.
- npm workspaces already `packages/*` — new folder is enough; no root script change required.
- Add `ol: 'http://example.org/org-lite/'` to `DEFAULT_PREFIX_MAP` in `packages/harness/src/iri.ts` (and cover with a unit test) so compact LLM answers expand for org-lite the same way as `ou:` / `fl:`.
- Update tests that hard-code task counts (e.g. e2e / loadPacks / eval expectations of 8 → 16) wherever they assert pack or matrix size.
- Mock methods remain gold-shortcut; new tasks must have gold that shortcut returns unchanged.

### 5. Paper / PRODUCT

- `docs/paper/04-experiments.md`: update pack list and task totals (8→16); do **not** invent new MiniMax rows.
- `PRODUCT.md`: note third public pack + task count; industrial park still later.

### 6. Testing / acceptance

| Check | Pass criteria |
| --- | --- |
| `npm test` | All green (update count expectations) |
| `npm run eval` | 11 × 16 = **176** rows, all score 1.0, 0 failures |
| `npm run eval:strict` | Runs; no accidental enable of industrial-park |
| loadPacks | Loads three enabled packs; industrial-park skipped |
| iri | `ol:…` expands; comma-joined org objectIds still expand per segment |

## Implementation order (for plan)

1. Failing tests for task count / new pack id / `ol:` prefix.
2. Extend mini + foaf TTL/tasks.
3. Add org-lite package + tasks.
4. Wire `ol:` prefix + fix hard-coded 8s.
5. Mock eval + paper/PRODUCT count lines.
6. Commit on feature branch; ask Way before merge to `main`.

## Out of scope reminders

No MiniMax re-run this PR; no remote push; industrial-park stays off.
