# 3. 方法矩阵 M0–M10

统一接口：`run(task, reasoner) → Answer`。第一期均为可跑 runner（非纸面描述）；mock reasoner 下确定性；真实 LLM 走同一接口（第二期）。

| ID | 名称 | 要点 |
|----|------|------|
| M0 | PromptDump | 本体全文塞进提示，无检索 |
| M1 | SchemaHint | 仅类型/属性摘要进提示 |
| M2 | RAGChunks | 切块检索后注入 |
| M3 | GraphRAG | 子图/路径检索增强 |
| M4 | OG-RAG | 本体引导的检索生成 |
| M5 | ToolMCP | MCP/工具按需查询本体 |
| M6 | SHACLGate | 生成后规则/SHACL 风格校验再答 |
| M7 | Onto2Tools | 本体→工具 schema 再调工具 |
| M8 | TaxonomyEnrich | **Planeteer** 风格：taxonomy 对齐 + enrichment |
| M9 | GovernedWrite | **Onto Planet** 风格：治理写回/受控变更提案（不直接改文件） |
| M10 | ActionSDK | **Palantir OSDK/AIP** 风格：类型化 Action + 对象集字段 |

## 3.1 Mock 捷径与严格模式

- 默认 `npm run eval`：`reasoner.id === 'mock'` 且非 `strictMock` 时，方法可走 **mock-shortcut**（返回金标形状，并在 `meta.strategy` 标明），用于证明管道连通。
- `npm run eval:strict`：`strictMock: true`，禁止捷径，只走 prompt→reasoner；空 fixtures 下答案为稳定 `MOCK:<hash>`，分数预期近零。

**切勿**把默认表当作 LLM 能力排名。

## 3.2 非依赖

M8–M10 均为 harness 内风格适配，**不**链接对方私有 SDK。
