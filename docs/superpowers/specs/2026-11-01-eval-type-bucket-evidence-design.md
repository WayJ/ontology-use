# Design: Eval type-bucket reporting + optional Task.evidence

**Date:** 2026-11-01  
**Status:** Approved (Way: Approach A — writeResults 按 type 分桶列；ScoreResult 带 taskType；Task.evidence 可选，进 JSON/预览但不改 exact/set/fields 主分)  
**Repo:** `/workspace/ontology-use`  
**Prior art:** IndusSpec-QA (Park et al., EMNLP 2026) 按题型加权；ClimateKG (Acharya et al.) 证据绑定；本仓 `ScoreResult` / `writeResults` / `loadPacks`  
**Context:** ChatGPT 分享简报「企业业务知识建模」启示 → 先学测评方式，再最小改 harness

## Problem

当前 harness：

- `scoreAnswer` 仅有 `exact` / `set` / `fields` 三种主分，结果表只按 method 报总均分。
- `latest.json` / markdown 汇总**不按** `Task.type` 分桶，无法对照 IndusSpec-QA 式「Rule / Multi-hop / Table」分桶报告。
- `Task` 无 provenance / evidence 字段；即使 pack 将来绑文档出处，结果 JSON 也无处透传。
- 主 scorer 行为正确且稳定（16 题 mock 176×1.0）；本轮**不应**改主分公式。

## Goals

1. **按 type 分桶汇总**：每个 method 除总均分外，报告该 method 在 `exact` / `set` / `fields` 子集上的均分。
2. **可选 evidence 透传**：`Task.evidence?: string | string[]` 经 `loadPacks` 进入结果 JSON；**不参与** `scoreAnswer`。
3. 现有 16 个公开任务**无需**改 pack JSON；兼容旧结果读者（新列/新字段为增量）。
4. 本地提交设计与后续实现；**不**推远程；**不**强制复跑 MiniMax。

## Non-goals

- 本轮不加 scope 对抗题 / 新 pack 任务。
- 不拆 `constraintPass` / SHACL 独立通道。
- 不改 `scoreAnswer` 主逻辑（trim/case、set 多重集合、fields 键值）。
- 不把无关本地 diff（MiniMax fetch timeout、`eval` progress `console.error`）并进本变更；实现时若碰到 `eval.ts`，只加 `taskType` 赋值，timeout/日志另 commit 已存在则勿回滚、勿混提。
- 不推远程；不 force-rewrite `main`。

## Locked approach A

### 1. `ScoreResult.taskType`

在 `packages/core/src/types.ts`：

```ts
export type ScoreResult = {
  methodId: MethodId
  taskId: string
  ok: boolean
  score: number
  error?: string
  answerPreview?: string
  rawLength?: number
  /** Copied from task.type at score time */
  taskType: 'exact' | 'set' | 'fields'
}
```

- 在 `packages/harness/src/eval.ts` 构造 `ScoreResult` 时设 `taskType: task.type`（成功与失败行均带上，便于分桶）。
- 旧磁盘结果缺该字段时：汇总代码对缺失 `taskType` 的行跳过分桶计入或视为未知（实现选「跳过该行的 type 桶、仍计总均分」即可；单元测试覆盖有 `taskType` 的路径）。

### 2. `writeResults` 分桶列

`packages/harness/src/writeResults.ts`：

- Markdown 方法汇总表增加列：**avgExact** / **avgSet** / **avgFields**（表头可用英文标识符，与现有 `avg` 风格一致；说明文字可用中文）。
- 对每个 `methodId`：取该 method 下 `taskType === 'exact'|'set'|'fields'` 的行，对 `score` 求算术平均。
- 若某 method 在某 type 上**零行**：单元格填 `—`（或空字符串，二选一；**锁定用 `—`**），勿填 `0`（避免与真零分混淆）。
- `latest.json`（及同等结构）：
  - 每行结果含 `taskType`；
  - 若对应 task 有 `evidence`，回显 `evidence`（与 task 同形：`string | string[]`）；
  - 汇总对象可含 `byType: { exact?: number, set?: number, fields?: number }`（可选但推荐，便于机器读）。

主分列（现有 overall avg / pass rate）保持不变。

### 3. `Task.evidence`（可选）

```ts
export type Task = {
  id: string
  type: 'exact' | 'set' | 'fields'
  question: string
  gold: string | string[] | Record<string, string>
  ontologyRefs?: string[]
  /** Provenance / source refs; not used by scoreAnswer */
  evidence?: string | string[]
}
```

- **不**改变 `exact` / `set` / `fields` 得分。
- 结果 JSON 在有值时原样回显；markdown 任务明细若已有预览列，可择要展示截断 evidence（YAGNI：至少 JSON 必须有；md 明细可选）。

### 4. `loadPacks` / `isTask`

- 允许 JSON 任务带可选 `evidence`。
- 若存在：类型必须是 `string` 或「每项均为 string 的数组」；否则拒绝该任务（与现有严格校验风格一致）。
- 缺省字段：行为与今日完全相同。

### 5. 主 scorer 不变

`scoreAnswer` 签名与分支逻辑不动；不读 `evidence`。

### 6. 测试

| 检查 | 通过标准 |
| --- | --- |
| unit `writeResults` | 给定混合 type 的假 `ScoreResult[]`，md 含 avgExact/avgSet/avgFields；零 type 行为 `—` |
| unit `loadPacks` / `isTask` | 接受带 `evidence` 的 fixture；错误类型被拒 |
| unit / 集成 | 带 `evidence` 的一行写入 `latest.json` 后仍可见 |
| e2e | mock eval 后 md 表头含 type 分桶列名；现有 16 题无需改 |
| `npm test` | 全绿 |
| `npm run eval` | 仍 176 行、分仍 1.0；表头多出分桶列 |

公开 pack **不强制**加 evidence；单元测试用内存/临时 fixture 即可。

### 7. 文档（可放实现计划任务）

- `PRODUCT.md` 或 paper 实验节一句：mock/结果表现按 `exact`/`set`/`fields` 分桶均分；evidence 为可选 provenance，不进主分。
- 本 design 批准后另写 `docs/superpowers/plans/2026-11-01-eval-type-bucket-evidence.md` 再动手改代码。

## Files likely touched (implementation later)

| File | Change |
| --- | --- |
| `packages/core/src/types.ts` | `ScoreResult.taskType`；`Task.evidence?` |
| `packages/harness/src/eval.ts` | 写 `taskType`；**勿**混入无关 progress/timeout 改动 |
| `packages/harness/src/writeResults.ts` | 分桶列 + JSON 字段 |
| `packages/harness/src/loadPacks.ts` | `isTask` 校验 `evidence` |
| `packages/harness` 对应 `*.test.ts` / `e2e.test.ts` | 上表测试 |
| `PRODUCT.md` / paper（可选小触） | 一句说明 |

## Success criteria

1. `npm test` 全绿。  
2. `npm run eval` 产出的 markdown 含 type 分桶列；overall 行为与改前一致（16×11 mock 全 1.0）。  
3. 可选 `evidence` 仅需在**单元测试 fixture** 覆盖；公开 pack 可不改。  
4. 主 scorer 无行为变化。

## Implementation order (for later plan)

1. 红测：`writeResults` 分桶 + `isTask` evidence。  
2. 类型 + `eval` 填 `taskType` + `writeResults` + `loadPacks`。  
3. e2e 表头断言；跑 `npm test` / `npm run eval`。  
4. 可选 PRODUCT/paper 一句。  
5. 单独 commit 实现；与 timeout/progress 等无关 diff 隔离。

## Out of scope reminders

No MiniMax re-run required for merge；no remote push；no scope-adversarial tasks；no constraintPass channel this round.
