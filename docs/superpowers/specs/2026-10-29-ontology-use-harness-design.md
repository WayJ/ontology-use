# ontology-use 评测 harness 设计规格

**日期:** 2026-10-29  
**状态:** 待用户审阅  
**定位:** 研究项目（评测基准 + 方法对照 + 论文），不是 SDK/MCP 产品。

## 1. 目标与成功标准

### 目标
用精简 TypeScript/Node harness，在同一公开 OWL/RDF 任务集上跑方法矩阵 **M0–M10**，默认 **mock reasoner**，可选真实 LLM；产出可比表格，支撑论文结论。

### 成功标准（第一期）
- 本机一条命令（如 `npm run eval`）跑完整 mock 评测并写出方法×指标表。
- 结论只引用本次跑出的 `results/`，可复跑核对。
- 工业园 ontology 为可选 add-on pack，不进入默认评测。

### 非目标
建模 UI、生产 SDK、Computer Use、为投稿而发表、依赖对方私有 SDK。

## 2. 架构与目录（方案 A）

```
ontology-use/
  packages/
    harness/          # CLI：读任务包 → 调方法 → 打分 → 写表
    packs/            # 公开 OWL/RDF 任务包（JSON + ontology 文件）
    methods/          # M0–M10 各一个 runner（统一接口）
    reasoners/        # mock（默认）+ 可选 llm 适配
  docs/
    superpowers/specs/
    paper/            # 论文骨架（后写）
  results/            # 评测产物（gitignore 大体积时可保留 latest 指针）
  package.json        # npm run eval → 表
```

约定：每个 method 实现 `run(task, reasoner) → Answer`；harness 不关心方法内部。

## 3. 评测数据流

一次 `npm run eval`：

1. 读 `packs/*` 中**启用**的任务（问题 + 金标 + 引用的 OWL/RDF）。
2. 对每个方法 M0–M10：`Answer = method.run(task, reasoner)`（默认 mock；可换真实 LLM）。
3. 按任务类型打分（精确匹配 / 集合 F1 / 结构化字段；类型写在 pack 元数据）。
4. 写出 `results/latest.md`（方法×指标表）+ `results/latest.json`（可复跑核对）。

**失败策略:** 单个任务/方法抛错记为该格失败并继续，不中断整次评测。

## 4. 方法接口（M0–M10）

```ts
type MethodId = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9' | 'M10'

type Method = {
  id: MethodId
  name: string
  run(task: Task, reasoner: Reasoner): Promise<Answer>
}
```

第一期每个方法都是可跑的 runner（非纸面描述）。mock reasoner 下输出确定性，便于 CI/本地复跑；接真实 LLM 时走同一接口。

| ID | 方法 | 要点 |
|----|------|------|
| M0 | PromptDump | 本体全文塞进提示，无检索 |
| M1 | SchemaHint | 仅类型/属性摘要进提示 |
| M2 | RAGChunks | 切块检索后注入 |
| M3 | GraphRAG | 子图/路径检索增强 |
| M4 | OG-RAG | 本体引导的检索生成 |
| M5 | ToolMCP | MCP/工具按需查询本体 |
| M6 | SHACLGate | 生成后 SHACL/规则校验再答 |
| M7 | Onto2Tools | 本体→工具 schema 再调工具 |
| M8 | TaxonomyEnrich | Planeteer×Currence：taxonomy 对齐 + enrichment |
| M9 | GovernedWrite | Onto Planet 风格：治理写回/受控变更 |
| M10 | ActionSDK | Palantir OSDK/AIP 风格：类型化 Action + 对象集 |

M8–M10 在 harness 内做风格适配，**不**依赖对方私有 SDK。

## 5. 任务包（packs）与金标

每个 pack 目录：

- `manifest.json`（启用开关、任务类型、打分规则引用）
- ontology 文件（公开 OWL/RDF）
- `tasks/*.json`：字段 `id`、`type`、`question`、`gold`、可选 `ontologyRefs`
- `README` / `attribution`：来源与许可

默认评测只用公开包；工业园为可选 add-on，默认关掉。

金标优先可自动比对（IRI / 字面量 / 集合），避免开放文本。

## 6. Reasoner、测试与验收

### Reasoner
- **mock（默认）:** 确定性、零网络；`npm run eval` 默认走它。
- **LLM（可选）:** 同一接口；需显式 flag / env；结果进单独目录，避免污染默认表。

### 测试
- 每个 method 至少一个单测：mock 下固定任务 → 期望 `Answer`。
- harness 集成测：迷你 pack 跑通并产出表。

### 验收
- 本机一条命令出完整 M0–M10 × 指标表。
- 论文/结论只引用本次 `results/`，可复跑。

## 7. 实现与协作约定

- 流程：brainstorm（已完成）→ 本 spec 用户审阅 → `writing-plans` → TDD / 子代理执行 → `verification-before-completion`。
- 实现阶段：由 Cursor 云端 coding agent 在仓库落地；本助手监督规格、计划、验收与复跑证据，不编造未跑出的数字。
- 先前云端脚手架若存在，仅作参考；本设计通过后按本 spec 重做或对齐，不以未在本机复跑的声称结果为准。

## 8. 开放项（实现计划阶段再钉）

- 第一批公开本体具体选型（W3C / 常用开放 OWL 集）。
- 各 `task.type` 与打分器精确映射表。
- monorepo 工具链（npm workspaces / pnpm）最终选型。
