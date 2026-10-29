# ontology-use · 产品规划（研究定位）

## 定位
研究项目：Agent 怎样更好地使用本体（Ontology）。交付 = **评测基准** + **多方法对照跑手** + **代表项目成果的论文**（不投稿也可，作为最终成效文档），**不是**给 Agent 调用的 SDK/MCP 产品。

## 最终交付物
1. 评测集（任务、本体包、金标、指标）
2. 方法矩阵 M0–M10 的可复现 runners + 对照表
3. 论文草稿（中文为主）：问题、相关工作、方法、实验、结论与推荐用法
4. 规划 Page（持续迭代）

## Planeteer（拼写：Planeteer）
公开实践（Currence case study）：共享行业 taxonomy 对齐 CRM + 日更 enrichment / sourcing / pass-回流。评测方法 **M8 TaxonomyEnrich** 对齐此路径。勿与 Onto Planet 产品混淆。

## 方法矩阵（第一期：全量进入评测脚手架）
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
| M8 | TaxonomyEnrich | Planeteer 风格：taxonomy 对齐 + enrichment |
| M9 | GovernedWrite | Onto Planet 风格：治理写回/受控变更 |
| M10 | ActionSDK | Palantir OSDK/AIP 风格：类型化 Action + 对象集 |

## 两大支柱
1. 基准/评测套件（同一任务集跑各 M*）
2. 方法矩阵对照 → 给出相对最优用法建议（写入论文）

## 非目标
建模 UI；生产 SDK；Computer Use；为发表而投稿（论文可不发布）。

## 状态
第一期 harness 已落地（2026-10-29）：M0–M10 + public-mini + foaf-lite + mock/strict + **MiniMax CN LLM** 评测 + 论文骨架。
默认 `npm run eval` 为 mock-shortcut 烟测；`eval:strict` 无捷径；`npm run eval -- --reasoner=llm` 需 `MINIMAX_API_KEY`，默认模型 `MiniMax-M3.1-Flash`、`https://api.minimax.cn/v1`，结果进 `results/llm-<stamp>/`（gitignore；`meta.maxConcurrency: 5`）。
仓路径：`/workspace/ontology-use`。更大公开 pack / 工业园启用仍为后续。
