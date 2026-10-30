# Public Pack Expand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow default-enabled public eval tasks from 8 to 16 by extending `public-mini` (+2) and `public-foaf-lite` (+2) and adding a new `public-org-lite` pack (+4), with `ol:` prefix support, without enabling industrial-park or inventing LLM scores.

**Architecture:** Data-only pack growth under `packages/*` (TTL + task JSON + manifests). Harness already loads every `manifest.enabled: true` pack via `loadEnabledPacks`; only add `ol:` to `DEFAULT_PREFIX_MAP` so compact org-lite answers expand like `ou:` / `fl:`. Mock gold-shortcut stays unchanged, so default `npm run eval` becomes 11 × 16 = 176 rows at score 1.0. Paper/PRODUCT update pack counts only; historical MiniMax table stays an 8-task run with an explicit note.

**Tech Stack:** TypeScript, vitest, npm workspaces (`packages/*`), Turtle/OWL fixtures, existing harness (`loadPacks`, `scoreAnswer`, `iri.ts`), Node 22.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-30-public-pack-expand-design.md` (on `main` at `5f7f608`)
- Approach **C**; target **16** tasks: mini **7**, foaf-lite **5**, org-lite **4**
- All ontology IRIs under `http://example.org/…` (no real FOAF/Schema.org namespaces in gold or TTL)
- Prefix `ol:` → `http://example.org/org-lite/`
- Industrial-park stays `enabled: false`
- Do **not** run live MiniMax / invent LLM scores; leave §4.4 table as historical 8-task run + note that default pack grew
- Do **not** push remotes
- Do **not** change scorers, reasoners, or IRI expand logic beyond adding `ol:` to `DEFAULT_PREFIX_MAP`
- Mock shortcut unchanged (`reasoner.id === 'mock'` && not strict → gold)
- Gold JSON uses **expanded** IRIs; fields gold keys remain `action` + `objectIds` (comma-joined expanded IRIs)
- TDD: failing test → implement → pass → commit per task
- Implement on branch **`feat/public-pack-expand`** created from current `main`; ask Way before merge to `main`
- Work in `/workspace/ontology-use` (local-only)

---

## File map

| File | Responsibility |
| --- | --- |
| `packages/harness/src/iri.ts` | Add `ol: 'http://example.org/org-lite/'` to `DEFAULT_PREFIX_MAP` |
| `packages/harness/src/iri.test.ts` | Assert `ol` default + `ol:…` / comma-joined `ol:` expand |
| `packages/packs-public-mini/ontology/mini.ttl` | Add `ou:carol`, `ou:Beta`, Carol→Beta `worksAt` |
| `packages/packs-public-mini/tasks/t006-exact.json` | New exact task (Acme label) |
| `packages/packs-public-mini/tasks/t007-set.json` | New set task (Organization individuals) |
| `packages/packs-public-mini/attribution.md` | Document new individuals / task ids |
| `packages/packs-public-foaf-lite/ontology/foaf-lite.ttl` | Add `fl:dave`; `fl:carol fl:knows fl:dave` |
| `packages/packs-public-foaf-lite/tasks/t004-exact.json` | New exact (`foaf-t004`, Carol name) |
| `packages/packs-public-foaf-lite/tasks/t005-fields.json` | New fields (`foaf-t005`, Introduce bob→dave) |
| `packages/packs-public-foaf-lite/attribution.md` | Note dave + new tasks |
| `packages/packs-public-org-lite/package.json` | Workspace package `@ontology-use/packs-public-org-lite` |
| `packages/packs-public-org-lite/manifest.json` | `id: public-org-lite`, `enabled: true` |
| `packages/packs-public-org-lite/attribution.md` | Synthetic org-lite attribution (CC0) |
| `packages/packs-public-org-lite/README.md` | Short pack README |
| `packages/packs-public-org-lite/ontology/org-lite.ttl` | Org/Employee/Role graph |
| `packages/packs-public-org-lite/tasks/org-t001-exact.json` | Exact class of employee |
| `packages/packs-public-org-lite/tasks/org-t002-set.json` | Set members of org |
| `packages/packs-public-org-lite/tasks/org-t003-fields.json` | Fields AssignMemberOf |
| `packages/packs-public-org-lite/tasks/org-t004-set.json` | Set role holders |
| `packages/harness/src/e2e.test.ts` | Expect `public-org-lite`; `taskCount >= 16` |
| `docs/paper/04-experiments.md` | Pack list 7+5+4=16; mock/strict counts 176; LLM table historical note |
| `PRODUCT.md` | Third public pack + 16 tasks; industrial park still later |
| `docs/paper/05-discussion.md` | Mock pipeline “8 任务” → “16 任务” only (no LLM invent) |
| `README.md` | Mention `packs-public-org-lite` in pack list if present |

---

### Task 0: Create feature branch

**Files:** none (git only)

**Interfaces:**
- Consumes: clean `main` at tip including design `5f7f608` (or later)
- Produces: local branch `feat/public-pack-expand`

- [ ] **Step 1: Branch from main**

```bash
cd /workspace/ontology-use
git checkout main
git status   # must be clean
git checkout -b feat/public-pack-expand
```

Expected: `On branch feat/public-pack-expand`

- [ ] **Step 2: No commit yet** (branch tip equals `main`)

---

### Task 1: Add `ol:` to DEFAULT_PREFIX_MAP (TDD)

**Files:**
- Modify: `packages/harness/src/iri.ts`
- Modify: `packages/harness/src/iri.test.ts`

**Interfaces:**
- Consumes: existing `DEFAULT_PREFIX_MAP`, `expandCompactIri` (comma-per-segment already on `main`)
- Produces: `DEFAULT_PREFIX_MAP.ol === 'http://example.org/org-lite/'`; `expandCompactIri('ol:Employee')` → `http://example.org/org-lite/Employee`

- [ ] **Step 1: Write the failing tests**

Extend `packages/harness/src/iri.test.ts`:

```ts
describe('DEFAULT_PREFIX_MAP', () => {
  it('includes ou, fl, and ol pack defaults', () => {
    expect(DEFAULT_PREFIX_MAP.ou).toBe('http://example.org/ou/')
    expect(DEFAULT_PREFIX_MAP.fl).toBe('http://example.org/foaf-lite/')
    expect(DEFAULT_PREFIX_MAP.ol).toBe('http://example.org/org-lite/')
  })
})

describe('expandCompactIri', () => {
  // keep existing ou/fl/comma tests unchanged

  it('expands ol:Employee with defaults', () => {
    expect(expandCompactIri('ol:Employee')).toBe(
      'http://example.org/org-lite/Employee',
    )
  })

  it('expands each segment of comma-joined ol: IRIs', () => {
    expect(expandCompactIri('ol:alice,ol:AcmeOrg')).toBe(
      'http://example.org/org-lite/alice,http://example.org/org-lite/AcmeOrg',
    )
  })
})
```

Rename the old `includes ou and fl pack defaults` test to the new title above (one test, three expects).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /workspace/ontology-use && npx vitest run packages/harness/src/iri.test.ts`

Expected: FAIL — `DEFAULT_PREFIX_MAP.ol` is `undefined` / expected `'http://example.org/org-lite/'`

- [ ] **Step 3: Minimal implementation**

In `packages/harness/src/iri.ts`, change:

```ts
export const DEFAULT_PREFIX_MAP: Readonly<Record<string, string>> = {
  ou: 'http://example.org/ou/',
  fl: 'http://example.org/foaf-lite/',
  ol: 'http://example.org/org-lite/',
}
```

No other logic changes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /workspace/ontology-use && npx vitest run packages/harness/src/iri.test.ts`

Expected: PASS (all iri tests green)

- [ ] **Step 5: Commit**

```bash
git add packages/harness/src/iri.ts packages/harness/src/iri.test.ts
git commit -m "feat(harness): add ol: to DEFAULT_PREFIX_MAP for org-lite"
```

---

### Task 2: Extend public-mini TTL + t006 / t007

**Files:**
- Modify: `packages/packs-public-mini/ontology/mini.ttl`
- Create: `packages/packs-public-mini/tasks/t006-exact.json`
- Create: `packages/packs-public-mini/tasks/t007-set.json`
- Modify: `packages/packs-public-mini/attribution.md`

**Interfaces:**
- Consumes: existing mini individuals `ou:alice`, `ou:bob`, `ou:Acme`; prefix `ou:` → `http://example.org/ou/`
- Produces: pack `public-mini` with **7** tasks; gold grounded in updated TTL

- [ ] **Step 1: Write failing e2e expectation for mini growth (optional early assert)**

Prefer asserting pack growth in Task 5’s e2e update. For this task, after files exist, verify load counts with a one-off node/vitest check in Step 4.

- [ ] **Step 2: Extend `mini.ttl` to the following full contents**

```turtle
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ou: <http://example.org/ou/> .

ou:Person a owl:Class ;
  rdfs:label "Person" .

ou:Organization a owl:Class ;
  rdfs:label "Organization" .

ou:worksAt a owl:ObjectProperty ;
  rdfs:domain ou:Person ;
  rdfs:range ou:Organization ;
  rdfs:label "works at" .

ou:alice a ou:Person ;
  rdfs:label "Alice" ;
  ou:worksAt ou:Acme .

ou:bob a ou:Person ;
  rdfs:label "Bob" ;
  ou:worksAt ou:Acme .

ou:carol a ou:Person ;
  rdfs:label "Carol" ;
  ou:worksAt ou:Beta .

ou:Acme a ou:Organization ;
  rdfs:label "Acme Corp" .

ou:Beta a ou:Organization ;
  rdfs:label "Beta Inc" .
```

- [ ] **Step 3: Create task JSON files**

`packages/packs-public-mini/tasks/t006-exact.json`:

```json
{
  "id": "t006",
  "type": "exact",
  "question": "What is the rdfs:label of http://example.org/ou/Acme?",
  "gold": "Acme Corp",
  "ontologyRefs": ["ontology/mini.ttl"]
}
```

`packages/packs-public-mini/tasks/t007-set.json`:

```json
{
  "id": "t007",
  "type": "set",
  "question": "List individuals of class http://example.org/ou/Organization",
  "gold": [
    "http://example.org/ou/Acme",
    "http://example.org/ou/Beta"
  ],
  "ontologyRefs": ["ontology/mini.ttl"]
}
```

Do **not** change t001–t005. Note: t002 Person set gold remains `[alice, bob]` only — carol is intentionally **not** added to t002 gold in this plan (existing task unchanged). New Person listing coverage is not required; t007 covers organizations.

- [ ] **Step 4: Update attribution**

Replace `packages/packs-public-mini/attribution.md` with:

```markdown
# Attribution

Synthetic mini OWL/RDF pack for ontology-use harness CI and local mock eval.

Contents:
- Classes: `ou:Person`, `ou:Organization`
- Property: `ou:worksAt`
- Individuals: `ou:alice`, `ou:bob`, `ou:carol`, `ou:Acme`, `ou:Beta`
- Tasks: t001–t007 (exact / set / fields ActionSDK-style) with auto-checkable IRI/literal gold

IRIs under `http://example.org/ou/` are examples only; not affiliated with any real dataset.
License: CC0-1.0 (public domain dedication for this fixture content).
```

- [ ] **Step 5: Sanity-check task files load**

Run:

```bash
cd /workspace/ontology-use
node --input-type=module -e "
import { loadEnabledPacks } from './packages/harness/src/loadPacks.ts';
import { resolve } from 'node:path';
const packs = await loadEnabledPacks(resolve('packages'));
const mini = packs.find(p => p.packId === 'public-mini');
console.log('mini tasks', mini?.tasks.length, mini?.tasks.map(t => t.id).sort());
"
```

If `tsx`/vitest path is easier:

```bash
npx vitest run packages/harness/src/loadPacks.test.ts
```

Expected: mini has **7** task ids including `t006`, `t007`. (If the one-liner fails on TS import, use:)

```bash
npm test -- packages/harness/src/loadPacks.test.ts
ls packages/packs-public-mini/tasks/ | wc -l   # expect 7
```

- [ ] **Step 6: Commit**

```bash
git add packages/packs-public-mini/ontology/mini.ttl \
  packages/packs-public-mini/tasks/t006-exact.json \
  packages/packs-public-mini/tasks/t007-set.json \
  packages/packs-public-mini/attribution.md
git commit -m "feat(packs): extend public-mini with t006/t007 and Beta org"
```

---

### Task 3: Extend public-foaf-lite + foaf-t004 / foaf-t005

**Files:**
- Modify: `packages/packs-public-foaf-lite/ontology/foaf-lite.ttl`
- Create: `packages/packs-public-foaf-lite/tasks/t004-exact.json`
- Create: `packages/packs-public-foaf-lite/tasks/t005-fields.json`
- Modify: `packages/packs-public-foaf-lite/attribution.md`

**Interfaces:**
- Consumes: existing `fl:alice`/`fl:bob`/`fl:carol`, prefix `fl:` → `http://example.org/foaf-lite/`
- Produces: pack `public-foaf-lite` with **5** tasks

- [ ] **Step 1: Extend `foaf-lite.ttl` to the following full contents**

```turtle
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix fl: <http://example.org/foaf-lite/> .

# FOAF-inspired shapes only; IRIs are example.org, not xmlns.com/foaf.

fl:Person a owl:Class ;
  rdfs:label "Person" .

fl:name a owl:DatatypeProperty ;
  rdfs:domain fl:Person ;
  rdfs:range rdfs:Literal ;
  rdfs:label "name" .

fl:knows a owl:ObjectProperty ;
  rdfs:domain fl:Person ;
  rdfs:range fl:Person ;
  rdfs:label "knows" .

fl:alice a fl:Person ;
  fl:name "Alice" ;
  fl:knows fl:bob .

fl:bob a fl:Person ;
  fl:name "Bob" ;
  fl:knows fl:carol .

fl:carol a fl:Person ;
  fl:name "Carol" ;
  fl:knows fl:dave .

fl:dave a fl:Person ;
  fl:name "Dave" .
```

Note: `foaf-t002` gold still lists only alice/bob/carol. **Do not** change `t002-set.json` in this plan (existing Person-list gold stays 3). New individual `dave` is used by foaf-t005 fields; Person-list coverage for dave is deferred (YAGNI) unless a later task adds it. Spec requires gold match TTL for **new** tasks; leaving foaf-t002 unchanged matches “extend only as needed” for new questions.

If implementers prefer consistency, optionally update foaf-t002 gold to include dave — **out of scope for this plan** (would change historical LLM row semantics for that task id). Leave t002 as-is.

- [ ] **Step 2: Create task JSON files**

`packages/packs-public-foaf-lite/tasks/t004-exact.json`:

```json
{
  "id": "foaf-t004",
  "type": "exact",
  "question": "What is the fl:name of http://example.org/foaf-lite/carol?",
  "gold": "Carol",
  "ontologyRefs": ["ontology/foaf-lite.ttl"]
}
```

`packages/packs-public-foaf-lite/tasks/t005-fields.json`:

```json
{
  "id": "foaf-t005",
  "type": "fields",
  "question": "Propose an ActionSDK Introduce action linking http://example.org/foaf-lite/bob to http://example.org/foaf-lite/dave via knows",
  "gold": {
    "action": "Introduce",
    "objectIds": "http://example.org/foaf-lite/bob,http://example.org/foaf-lite/dave"
  },
  "ontologyRefs": ["ontology/foaf-lite.ttl"]
}
```

- [ ] **Step 3: Update attribution**

Replace `packages/packs-public-foaf-lite/attribution.md` with:

```markdown
# Attribution

Synthetic **FOAF-inspired** lite pack for ontology-use harness eval.

- IRIs under `http://example.org/foaf-lite/` only — **not** the official FOAF vocabulary namespace.
- FOAF (Friend of a Friend) is inspiration for Person / name / knows shaped facts; this pack does **not** download or redistribute copyrighted FOAF dumps or the foaf ontology RDF from xmlns.com.
- Individuals: `fl:alice`, `fl:bob`, `fl:carol`, `fl:dave`.
- Tasks: foaf-t001–foaf-t005 (exact / set / fields).
- License for this fixture content: CC0-1.0.
```

- [ ] **Step 4: Verify five task files**

```bash
ls packages/packs-public-foaf-lite/tasks/
# expect: t001-exact.json t002-set.json t003-fields.json t004-exact.json t005-fields.json
```

- [ ] **Step 5: Commit**

```bash
git add packages/packs-public-foaf-lite/ontology/foaf-lite.ttl \
  packages/packs-public-foaf-lite/tasks/t004-exact.json \
  packages/packs-public-foaf-lite/tasks/t005-fields.json \
  packages/packs-public-foaf-lite/attribution.md
git commit -m "feat(packs): extend foaf-lite with foaf-t004/t005 and dave"
```

---

### Task 4: Create packs-public-org-lite package

**Files:**
- Create: `packages/packs-public-org-lite/package.json`
- Create: `packages/packs-public-org-lite/manifest.json`
- Create: `packages/packs-public-org-lite/attribution.md`
- Create: `packages/packs-public-org-lite/README.md`
- Create: `packages/packs-public-org-lite/ontology/org-lite.ttl`
- Create: `packages/packs-public-org-lite/tasks/org-t001-exact.json`
- Create: `packages/packs-public-org-lite/tasks/org-t002-set.json`
- Create: `packages/packs-public-org-lite/tasks/org-t003-fields.json`
- Create: `packages/packs-public-org-lite/tasks/org-t004-set.json`

**Interfaces:**
- Consumes: `ol:` prefix already in `DEFAULT_PREFIX_MAP` (Task 1); `loadEnabledPacks` scans `packages/*`
- Produces: pack id `public-org-lite`, `enabled: true`, **4** tasks with expanded-IRI gold

- [ ] **Step 1: Create package.json**

`packages/packs-public-org-lite/package.json`:

```json
{
  "name": "@ontology-use/packs-public-org-lite",
  "version": "0.0.1",
  "private": true,
  "description": "Tiny org/employee/role public pack (example.org IRIs only)"
}
```

- [ ] **Step 2: Create manifest.json**

`packages/packs-public-org-lite/manifest.json`:

```json
{
  "id": "public-org-lite",
  "enabled": true,
  "title": "Org-lite public mini pack (example.org)"
}
```

- [ ] **Step 3: Create attribution.md**

```markdown
# Attribution

Synthetic **org-lite** pack for ontology-use harness eval.

- IRIs under `http://example.org/org-lite/` only.
- Classes: Organization, Employee, Role; properties: memberOf, holdsRole, name.
- Not affiliated with any real company dataset or Schema.org download.
- License for this fixture content: CC0-1.0.
```

- [ ] **Step 4: Create README.md**

```markdown
# packs-public-org-lite

Enabled-by-default public pack. Tiny self-contained TTL using `example.org` IRIs
for Organization / Employee / Role shaped facts (see `attribution.md`).

Prefix: `ol:` → `http://example.org/org-lite/`.
```

- [ ] **Step 5: Create ontology/org-lite.ttl (full contents)**

```turtle
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ol: <http://example.org/org-lite/> .

ol:Organization a owl:Class ;
  rdfs:label "Organization" .

ol:Employee a owl:Class ;
  rdfs:label "Employee" .

ol:Role a owl:Class ;
  rdfs:label "Role" .

ol:memberOf a owl:ObjectProperty ;
  rdfs:domain ol:Employee ;
  rdfs:range ol:Organization ;
  rdfs:label "member of" .

ol:holdsRole a owl:ObjectProperty ;
  rdfs:domain ol:Employee ;
  rdfs:range ol:Role ;
  rdfs:label "holds role" .

ol:name a owl:DatatypeProperty ;
  rdfs:range rdfs:Literal ;
  rdfs:label "name" .

ol:AcmeOrg a ol:Organization ;
  ol:name "Acme Org" .

ol:BetaOrg a ol:Organization ;
  ol:name "Beta Org" .

ol:Engineer a ol:Role ;
  ol:name "Engineer" .

ol:Manager a ol:Role ;
  ol:name "Manager" .

ol:alice a ol:Employee ;
  ol:name "Alice" ;
  ol:memberOf ol:AcmeOrg ;
  ol:holdsRole ol:Engineer .

ol:bob a ol:Employee ;
  ol:name "Bob" ;
  ol:memberOf ol:AcmeOrg ;
  ol:holdsRole ol:Manager .

ol:carol a ol:Employee ;
  ol:name "Carol" ;
  ol:memberOf ol:BetaOrg ;
  ol:holdsRole ol:Engineer .
```

- [ ] **Step 6: Create four task JSON files**

`packages/packs-public-org-lite/tasks/org-t001-exact.json`:

```json
{
  "id": "org-t001",
  "type": "exact",
  "question": "What OWL class is http://example.org/org-lite/alice an instance of?",
  "gold": "http://example.org/org-lite/Employee",
  "ontologyRefs": ["ontology/org-lite.ttl"]
}
```

`packages/packs-public-org-lite/tasks/org-t002-set.json`:

```json
{
  "id": "org-t002",
  "type": "set",
  "question": "Which Employee individuals ol:memberOf http://example.org/org-lite/AcmeOrg?",
  "gold": [
    "http://example.org/org-lite/alice",
    "http://example.org/org-lite/bob"
  ],
  "ontologyRefs": ["ontology/org-lite.ttl"]
}
```

`packages/packs-public-org-lite/tasks/org-t003-fields.json`:

```json
{
  "id": "org-t003",
  "type": "fields",
  "question": "Propose an ActionSDK call to assign http://example.org/org-lite/alice as memberOf organization http://example.org/org-lite/AcmeOrg",
  "gold": {
    "action": "AssignMemberOf",
    "objectIds": "http://example.org/org-lite/alice,http://example.org/org-lite/AcmeOrg"
  },
  "ontologyRefs": ["ontology/org-lite.ttl"]
}
```

`packages/packs-public-org-lite/tasks/org-t004-set.json`:

```json
{
  "id": "org-t004",
  "type": "set",
  "question": "Which Employee individuals ol:holdsRole http://example.org/org-lite/Engineer?",
  "gold": [
    "http://example.org/org-lite/alice",
    "http://example.org/org-lite/carol"
  ],
  "ontologyRefs": ["ontology/org-lite.ttl"]
}
```

- [ ] **Step 7: Spot-check package layout**

```bash
find packages/packs-public-org-lite -type f | sort
# expect package.json manifest.json attribution.md README.md
#        ontology/org-lite.ttl
#        tasks/org-t001-exact.json org-t002-set.json org-t003-fields.json org-t004-set.json
```

- [ ] **Step 8: Commit**

```bash
git add packages/packs-public-org-lite
git commit -m "feat(packs): add public-org-lite pack (4 tasks)"
```

---

### Task 5: Update e2e for public-org-lite and taskCount ≥ 16

**Files:**
- Modify: `packages/harness/src/e2e.test.ts`
- Optionally touch: `README.md` (pack list line)

**Interfaces:**
- Consumes: three enabled packs from Tasks 2–4
- Produces: e2e asserts `public-org-lite` present, industrial-park absent, `taskCount >= 16`, results length `11 * taskCount`

- [ ] **Step 1: Write the failing e2e expectations**

Replace the e2e test body title and assertions in `packages/harness/src/e2e.test.ts` with:

```ts
  it('loads three public packs; results for all 11 methods; ≥16 tasks', async () => {
    const packs = await loadEnabledPacks(packsRoot)
    const packIds = packs.map((p) => p.packId).sort()
    expect(packIds).toContain('public-mini')
    expect(packIds).toContain('public-foaf-lite')
    expect(packIds).toContain('public-org-lite')
    expect(packs.some((p) => p.packId === 'industrial-park')).toBe(false)

    const taskCount = packs.reduce((n, p) => n + p.tasks.length, 0)
    expect(taskCount).toBeGreaterThanOrEqual(16)

    const methods = allMethods({ strictMock: false })
    expect(methods).toHaveLength(11)

    const results = await runEval({
      packsRoot,
      methods,
      reasoner: createMockReasoner(),
      outDir,
    })

    expect(results.length).toBe(methods.length * taskCount)

    const methodIds = [...new Set(results.map((r) => r.methodId))].sort(
      (a, b) => a.localeCompare(b, undefined, { numeric: true }),
    )
    expect(methodIds).toEqual([
      'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10',
    ])

    const md = await readFile(join(outDir, 'latest.md'), 'utf8')
    for (const id of methodIds) {
      expect(md).toContain(`| ${id} |`)
    }
    JSON.parse(await readFile(join(outDir, 'latest.json'), 'utf8'))
  })
```

If Tasks 2–4 are incomplete, this fails on missing `public-org-lite` or `taskCount`. With packs present it should pass immediately after the assertion update.

- [ ] **Step 2: Run e2e**

Run: `cd /workspace/ontology-use && npx vitest run packages/harness/src/e2e.test.ts`

Expected: PASS — packIds include org-lite; taskCount ≥ 16; results length 11 × taskCount (176 if exactly 16)

- [ ] **Step 3: Update root README pack list if it lists packs**

In `README.md`, ensure a line exists similar to:

```markdown
- `packages/packs-public-org-lite` — org/employee/role lite pack (enabled)
```

near the existing foaf-lite bullet. Do not invent unrelated README sections.

- [ ] **Step 4: Commit**

```bash
git add packages/harness/src/e2e.test.ts README.md
git commit -m "test(harness): e2e expects public-org-lite and ≥16 tasks"
```

---

### Task 6: Mock eval + paper/PRODUCT count updates

**Files:**
- Modify: `docs/paper/04-experiments.md`
- Modify: `PRODUCT.md`
- Modify: `docs/paper/05-discussion.md` (mock “8 任务” → “16 任务” only)
- Do **not** rewrite §4.4 MiniMax numeric table

**Interfaces:**
- Consumes: disk results from `npm run eval` / `npm run eval:strict` after pack growth
- Produces: paper §4.1–4.3 reflect 16 tasks / 176 rows; §4.4 keeps historical 8-task LLM table + growth note; PRODUCT mentions third pack

- [ ] **Step 1: Run default mock eval**

```bash
cd /workspace/ontology-use
npm run eval
```

Expected: `results/latest.md` with 11 methods, each `tasks` column **16**, failures **0**, avg **1.0000**. Row count in JSON: **176**.

- [ ] **Step 2: Run strict mock eval**

```bash
npm run eval:strict
```

Expected: `results/strict/latest.md` — each method tasks **16**, failures **16**, avg **0.0000** (no gold shortcut). Industrial-park still absent from loaded packs.

- [ ] **Step 3: Update `docs/paper/04-experiments.md` §4.1**

Replace the pack bullets with:

```markdown
- **Packs（均 `enabled: true`）：**
  - `packages/packs-public-mini` — 7 任务（exact / set / fields）
  - `packages/packs-public-foaf-lite` — 5 任务（exact / set / fields；FOAF 风格灵感，`example.org` IRI）
  - `packages/packs-public-org-lite` — 4 任务（exact / set / fields；Organization / Employee / Role，`example.org` IRI）
  - 合计 **16** 个可自动打分任务；工业园 pack 仍为 `enabled: false`，不进默认评测。
```

- [ ] **Step 4: Update §4.2 mock table to 16 tasks / 176 rows**

Change the intro line to:

```markdown
命令：`npm run eval` → `results/latest.md`（本轮 **176** 行 = 11 方法 × 16 任务）
```

Update every row’s `tasks` cell from `8` to `16`, and the解读 sentence to “11 个方法 × 16 任务”.

- [ ] **Step 5: Update §4.3 strict table similarly**

Every method: tasks `16`, failures `16`.解读: “每方法 16 次失败计数”.

- [ ] **Step 6: Keep §4.4 LLM table as historical 8-task run; add growth note**

Do **not** change the numeric MiniMax table (still tasks=8, 88 rows, scores as on disk for `llm-20261029T231459`).

After the “行数：88（11×8）…” paragraph, append:

```markdown
> **Pack 增长说明（本仓库后续）：** 默认公开 pack 已扩至 **16** 任务（+`public-org-lite` 等；见 §4.1）。上表仍为扩 pack **之前**的 8 任务 MiniMax 跑（`results/llm-20261029T231459/`），**未**在 16 任务集上复跑；勿把上表 tasks=8 与当前默认 mock 的 16 任务混为同一次评测。
```

Update §4.5 to note public pack expand done; industrial-park / multi-model / cost still later:

```markdown
## 4.5 后续

默认公开 pack 已扩至 16 任务（mini 7 + foaf-lite 5 + org-lite 4）。工业园 add-on 启用、16 任务集上的 MiniMax/多模型复跑与成本/延迟指标：待实现后再引用新表。
```

- [ ] **Step 7: Update PRODUCT.md status**

Replace the status paragraph lines about packs with text that includes:

```markdown
第一期 harness 已落地（2026-10-29）：M0–M10 + public-mini + foaf-lite + **org-lite** + mock/strict + **MiniMax CN LLM** 评测 + 论文骨架。
默认公开可打分任务 **16**（工业园仍 `enabled: false`）。
…
仓路径：`/workspace/ontology-use`。工业园启用 / 16 任务 LLM 复跑仍为后续。
```

Keep MiniMax env / path notes; do not invent new LLM averages.

- [ ] **Step 8: Fix discussion mock count**

In `docs/paper/05-discussion.md`, change “8 任务” in the mock-pipeline sentence to “16 任务” (pipeline availability only). Do **not** alter LLM score discussion numbers.

- [ ] **Step 9: Commit**

```bash
git add docs/paper/04-experiments.md docs/paper/05-discussion.md PRODUCT.md
# results/ is typically gitignored — do not force-add
git commit -m "docs: paper/PRODUCT reflect 16-task public packs (LLM table historical)"
```

---

### Task 7: Full verification checklist

**Files:** none required (verification only); fix forward if anything fails

**Interfaces:**
- Consumes: all prior tasks on `feat/public-pack-expand`
- Produces: evidence for ask-before-merge gate

- [ ] **Step 1: Run full unit tests**

```bash
cd /workspace/ontology-use
npm test
```

Expected: all green (prior ~74 + new iri/e2e asserts; exact count may rise).

- [ ] **Step 2: Confirm mock eval matrix size**

```bash
npm run eval
node -e "
const j=require('./results/latest.json');
const n=Array.isArray(j)?j.length:(j.results||j).length;
console.log('rows', n);
"
```

Expected: **176** result rows (or equivalent structure — if `latest.json` is `{ results: [...] }`, count that array). Each method avg 1.0, failures 0 in `latest.md`.

- [ ] **Step 3: Confirm industrial-park still disabled**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const m = JSON.parse(readFileSync('packages/packs-industrial-park/manifest.json','utf8'));
if (m.enabled !== false) { console.error(m); process.exit(1); }
console.log('industrial-park enabled:', m.enabled);
"
```

Expected: `enabled: false`

- [ ] **Step 4: Confirm three pack ids and 16 tasks via loadEnabledPacks**

```bash
npx tsx -e "
import { loadEnabledPacks } from './packages/harness/src/loadPacks.ts';
import { resolve } from 'node:path';
const packs = await loadEnabledPacks(resolve('packages'));
console.log(packs.map(p => [p.packId, p.tasks.length]));
const n = packs.reduce((s,p)=>s+p.tasks.length,0);
console.log('total', n);
if (n < 16) process.exit(1);
"
```

Expected: `public-mini` 7, `public-foaf-lite` 5, `public-org-lite` 4, total 16.

(If `tsx -e` import path fails, use vitest e2e as the source of truth — already green in Task 5.)

- [ ] **Step 5: Confirm ol: expand smoke**

```bash
npx tsx -e "
import { expandCompactIri } from './packages/harness/src/iri.ts';
const a = expandCompactIri('ol:alice,ol:AcmeOrg');
console.log(a);
if (a !== 'http://example.org/org-lite/alice,http://example.org/org-lite/AcmeOrg') process.exit(1);
"
```

- [ ] **Step 6: Verification commit (checklist note only if needed)**

If Steps 1–5 passed with no further code edits, skip empty commit.

If small doc/test fixes were required, commit them:

```bash
git add -A
git status
git commit -m "chore: public-pack-expand verification fixes"
```

- [ ] **Step 7: Stop before merge — ask Way**

Do **not** merge to `main`. Do **not** push. Report branch tip SHA, test counts, eval 176×1.0, and ask whether to merge `feat/public-pack-expand` into local `main`.

---

## Self-review

### Spec coverage

| Spec requirement | Task |
| --- | --- |
| mini +2 (t006, t007) | Task 2 |
| foaf +2 (foaf-t004, foaf-t005) | Task 3 |
| new public-org-lite +4 (org-t001…t004) | Task 4 |
| Total 16; industrial-park enabled:false | Tasks 4–5, 7 |
| example.org IRIs only; ol: prefix map | Tasks 1, 4 |
| fields gold `{action, objectIds}` comma expanded IRIs | Tasks 3–4 |
| loadPacks / e2e / hard-coded counts | Task 5 |
| mock 176 × 1.0; no MiniMax re-run; no invented LLM scores | Task 6–7 |
| paper pack counts + PRODUCT; LLM table historical note | Task 6 |
| Branch feat/public-pack-expand; ask before merge; no push | Task 0, 7 |
| No scorer/reasoner/IRI-logic change beyond ol: default | Task 1 only |

### Placeholder scan

No TBD/TODO/`Similar to Task N` without code. All TTL and task JSON given in full. Paper edits specify exact replacement blocks; LLM numeric table left unchanged by instruction.

### Type / id consistency

- Task ids: `t006`, `t007`, `foaf-t004`, `foaf-t005`, `org-t001`…`org-t004`
- Pack id: `public-org-lite`; npm name: `@ontology-use/packs-public-org-lite`
- Prefix: `ol` → `http://example.org/org-lite/`
- Fields actions: foaf `Introduce`; org `AssignMemberOf`; mini existing `AssignWorksAt` untouched

### Known intentional non-updates

- Existing `t002` / `foaf-t002` gold lists **not** expanded to include newly added individuals (carol in mini Person set; dave in foaf Person set). New tasks cover new facts; changing old gold would invalidate historical LLM row identity for those task ids.
- `docs/paper/06-conclusion.md` still cites **88** LLM rows — correct for historical MiniMax run; do not “fix” to 176.

