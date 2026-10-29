# ontology-use 评测 harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可复跑的 TypeScript 评测 harness：默认 mock reasoner 一条命令跑 M0–M10，写出方法×指标表。

**Architecture:** npm workspaces monorepo；`harness` 读启用 packs、调统一 `Method.run`、打分、写 `results/latest.{md,json}`；`reasoners/mock` 确定性零网络；各 `methods/mN-*` 独立包/模块实现同一接口；公开 OWL/RDF 迷你 pack 默认启用，工业园 pack 默认关闭。

**Tech Stack:** TypeScript 5.x、Node ≥20（开发机可用 22）、npm workspaces、vitest、tsx（CLI）。

## Global Constraints

- 研究仓，不是 SDK/MCP 产品；不依赖 Palantir/Onto Planet/Planeteer 私有 SDK。
- 默认 `npm run eval` 必须零网络、确定性（mock reasoner）。
- 真实 LLM 仅显式 flag/env，结果写入独立目录（如 `results/llm-<runid>/`）。
- 结论只引用本次 `results/`；单任务/方法失败记格失败并继续。
- 工业园 ontology 为可选 add-on，默认不进评测。
- 金标优先 IRI/字面量/集合自动比对，避免开放文本。
- TDD：每个可测行为先写失败测试再实现。
- Spec: `docs/superpowers/specs/2026-10-29-ontology-use-harness-design.md`

---

## File map（将创建）

```
package.json                 # workspaces + scripts.eval / test
tsconfig.base.json
packages/core/               # 共享类型 Task/Answer/Method/Reasoner/Score
packages/reasoners-mock/
packages/packs-public-mini/  # 默认启用的迷你公开本体+任务
packages/methods-m0/ … m10/  # 或 packages/methods/src/m0.ts …（实现选单一布局见 Task 1）
packages/harness/            # load → run → score → write
results/.gitkeep
```

**布局决定（本计划锁定）:** 方法放在 `packages/methods/src/{m0..m10}.ts` 单包导出 registry，避免 11 个微包；packs 仍独立目录便于加本体文件。

---

### Task 1: Monorepo scaffold + 共享类型

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/types.ts`, `packages/core/src/index.ts`, `vitest.config.ts`, `.gitignore`
- Test: `packages/core/src/types.test.ts`

**Interfaces:**
- Produces:
  - `Task`: `{ id: string; type: 'exact' | 'set' | 'fields'; question: string; gold: string | string[] | Record<string, string>; ontologyRefs?: string[] }`
  - `Answer`: `{ value: string | string[] | Record<string, string>; meta?: Record<string, unknown> }`
  - `Reasoner`: `{ id: string; complete(prompt: string): Promise<string> }`
  - `Method`: `{ id: MethodId; name: string; run(task: Task, reasoner: Reasoner): Promise<Answer> }`
  - `MethodId`: `'M0'|…|'M10'`
  - `ScoreResult`: `{ methodId: MethodId; taskId: string; ok: boolean; score: number; error?: string }`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/types.test.ts
import { describe, it, expect } from 'vitest'
import { isMethodId } from './types.js'

describe('isMethodId', () => {
  it('accepts M0 and M10', () => {
    expect(isMethodId('M0')).toBe(true)
    expect(isMethodId('M10')).toBe(true)
  })
  it('rejects junk', () => {
    expect(isMethodId('M11')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/types.test.ts`
Expected: FAIL (module/export missing)

- [ ] **Step 3: Minimal implementation**

实现 `packages/core/src/types.ts` 中上述类型与 `isMethodId`；根 `package.json` workspaces: `["packages/*"]`；scripts: `"test": "vitest run"`, `"eval": "npm run eval -w @ontology-use/harness"`（harness 尚未存在时先留脚本，Task 5 接通）。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for types.test.ts

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.base.json packages/core vitest.config.ts .gitignore
git commit -m "feat: scaffold core types for ontology-use harness"
```

---

### Task 2: Mock reasoner

**Files:**
- Create: `packages/reasoners-mock/package.json`, `packages/reasoners-mock/src/index.ts`
- Test: `packages/reasoners-mock/src/index.test.ts`

**Interfaces:**
- Consumes: `Reasoner` from `@ontology-use/core`
- Produces: `createMockReasoner(fixtures?: Record<string, string>): Reasoner` — `complete` 对相同 prompt 返回相同字符串；无匹配时返回稳定的 `MOCK:<hash(prompt)>` 或从 fixtures 按包含子串匹配（计划锁定：**精确 prompt 键**；方法侧构造固定 prompt）

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { createMockReasoner } from './index.js'

describe('createMockReasoner', () => {
  it('is deterministic', async () => {
    const r = createMockReasoner({ 'hello': 'world' })
    expect(await r.complete('hello')).toBe('world')
    expect(await r.complete('hello')).toBe('world')
  })
  it('stable fallback', async () => {
    const r = createMockReasoner()
    const a = await r.complete('x')
    const b = await r.complete('x')
    expect(a).toBe(b)
    expect(a.startsWith('MOCK:')).toBe(true)
  })
})
```

- [ ] **Step 2–4:** 失败 → 实现 → 通过

- [ ] **Step 5: Commit** `feat: add deterministic mock reasoner`

---

### Task 3: 迷你公开 pack + loader

**Files:**
- Create: `packages/packs-public-mini/manifest.json`, `packages/packs-public-mini/ontology/mini.ttl`, `packages/packs-public-mini/tasks/t001-exact.json`, `packages/packs-public-mini/tasks/t002-set.json`, `packages/packs-public-mini/attribution.md`
- Create: `packages/harness/src/loadPacks.ts`（可先放 harness 包）
- Test: `packages/harness/src/loadPacks.test.ts`

**Interfaces:**
- `manifest.json`: `{ "id": "public-mini", "enabled": true, "title": "Public mini OWL/RDF pack" }`
- `mini.ttl`: 至少含一个 class 与一个个体（示例 IRI `http://example.org/ou/Person`, `http://example.org/ou/alice`）
- `loadEnabledPacks(rootDir: string): Promise<{ packId: string; tasks: Task[]; ontologyPaths: string[] }[]>` — 只加载 `enabled: true`

- [ ] **Step 1: Failing test** — 指向临时目录或仓库内 `packages/packs-public-mini`，断言加载到 ≥2 tasks，且工业园假目录 `enabled:false` 被跳过。

- [ ] **Step 2–4:** 实现 loader + 迷你本体/任务

- [ ] **Step 5: Commit** `feat: add public-mini pack and pack loader`

---

### Task 4: Scorers

**Files:**
- Create: `packages/harness/src/score.ts`
- Test: `packages/harness/src/score.test.ts`

**Interfaces:**
- `scoreAnswer(task: Task, answer: Answer): { ok: boolean; score: number }`
  - `exact`: 规范化字符串全等 → 1/0
  - `set`: 集合 F1（元素字符串规范化）
  - `fields`: 各字段 exact 的平均分

- [ ] **Step 1: Failing tests** covering exact match, set F1=1, set partial, fields average

- [ ] **Step 2–4:** implement → pass

- [ ] **Step 5: Commit** `feat: add task scorers (exact/set/fields)`

---

### Task 5: Eval harness CLI + results writer

**Files:**
- Create: `packages/harness/package.json`, `packages/harness/src/eval.ts`, `packages/harness/src/writeResults.ts`, `packages/harness/src/cli.ts`
- Test: `packages/harness/src/eval.test.ts`
- Modify: root `package.json` `"eval": "npm run eval -w @ontology-use/harness"`

**Interfaces:**
- `runEval(opts: { packsRoot: string; methods: Method[]; reasoner: Reasoner; outDir: string }): Promise<ScoreResult[]>`
- 写出 `outDir/latest.json` 与 `outDir/latest.md`（markdown 表：行=方法，列=平均分/任务数/失败数）
- CLI: `tsx src/cli.ts` → 默认 packs=`packages`，out=`../../results`，reasoner=mock

- [ ] **Step 1: Failing integration test** with 1 fake method + mini pack fixtures → asserts file written and one ScoreResult

- [ ] **Step 2–4:** implement → pass；根目录 `npm run eval` 可调用（方法 registry 可先空数组，Task 6 填满）

- [ ] **Step 5: Commit** `feat: eval harness writes latest.md/json`

---

### Task 6: Methods M0–M10（mock 确定性）

**Files:**
- Create: `packages/methods/package.json`, `packages/methods/src/registry.ts`, `packages/methods/src/m0.ts` … `m10.ts`, `packages/methods/src/index.ts`
- Test: `packages/methods/src/registry.test.ts` + 每方法至少一测（可 parametrize）

**Interfaces:**
- `allMethods(): Method[]` 长度 11，id M0…M10
- 各 `run`：用本体路径/任务构造**固定** prompt 字符串，调用 `reasoner.complete`，把返回解析为 `Answer`（mock 下通过 fixtures 映射到金标，使默认评测表非全零——**允许** method 在 mock 模式根据 `reasoner.id === 'mock'` 走确定性捷径返回 gold 形状的探测结果，但须在 `meta.strategy` 标明；真实 LLM 路径不做捷径）
- **锁定行为（避免水分数）:** mock 捷径仅用于证明管道；另提供 `strictMock: true` 时禁止捷径，只走 prompt→reasoner。默认 CI 用 `strictMock: false` 出表；单测两种都覆盖。

方法要点（实现最小桩）：
- M0: 拼接 ontology 全文 + question
- M1: 只拼接类型/属性摘要
- M2: 伪切块（按行）取 top-k 含问题词的块
- M3: 伪子图：TTL 中与问题词共现的三元组行
- M4: 在检索前加 "ontology-guided:" 前缀规则
- M5: 模拟工具调用序列写入 `meta.tools`
- M6: 生成后若答案 IRI 不在 ontology 文本中则标记 `meta.shaclFailed` 并清空
- M7: 把 class 名映射为假工具名再答
- M8: taxonomy 对齐：小写/同义词表后答
- M9: 答案写入 `meta.governedWrite` 提案对象，不改文件
- M10: 答案包装为 `{ action, objectIds }` fields 型

- [ ] **Step 1: Failing test** `allMethods()` length 11 and unique ids；每个 method 对固定 task+mock 返回 Promise\<Answer\>

- [ ] **Step 2–4:** implement registry + stubs → pass

- [ ] **Step 5: Commit** `feat: register M0–M10 method runners`

---

### Task 7: 端到端默认评测验收

**Files:**
- Modify: `packages/harness/src/cli.ts` 接入 `allMethods()` + `createMockReasoner`
- Create: `packages/harness/src/e2e.test.ts`
- Create: `README.md`（如何 `npm i && npm test && npm run eval`）

**Interfaces:**
- `npm run eval` → 退出码 0；`results/latest.md` 含 M0–M10 十一行；`results/latest.json` 可 JSON.parse

- [ ] **Step 1: E2E test** 调 `runEval` 断言 11 个 method 均有结果行

- [ ] **Step 2–4:** 接通 CLI → pass

- [ ] **Step 5: 本机验证**

```bash
npm test && npm run eval
# 检查 results/latest.md 含 M0..M10
```

Expected: tests PASS；表完整

- [ ] **Step 6: Commit** `feat: end-to-end mock eval for M0–M10`

---

## Spec coverage check

| Spec 节 | Task |
|---------|------|
| §2 目录/架构 A | 1, 3, 5, 6 |
| §3 数据流 + 失败继续 | 5（eval 循环 catch 记 error） |
| §4 Method 接口 M0–M10 | 6 |
| §5 packs/金标/工业园默认关 | 3 |
| §6 mock/LLM 分离、测试、一条命令 | 2, 4, 7（LLM 适配器可第二期；第一期只留 `--reasoner=llm` 抛「未实现」明确错误） |

## 第一期明确不做

- 真实 LLM 适配器实现（仅 CLI 拒绝并提示）
- 论文正文
- 工业园 pack 内容（可留 `enabled:false` 空壳目录）
- CI 配置（第二期）

