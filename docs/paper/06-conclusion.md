# 6. 结论

本文（草稿）给出 ontology-use **研究脚手架**：在公开迷你 OWL/RDF 任务包上，以统一接口跑 **M0–M10**，默认 mock 烟测与严格 mock 两套可复跑结果。

**已证实（仅基于当前磁盘结果）：**

1. `npm run eval` 下 M0–M10 在 **8** 个任务上平均分均为 **1.0000**、failures **0**（mock-shortcut 烟测；public-mini + foaf-lite）。
2. `npm run eval:strict` 下平均分均为 **0.0000**、每方法 failures **8**（无捷径 + 空 fixtures）。
3. `npm run eval -- --reasoner=llm`（MiniMax-M3.1-Flash @ api.minimax.cn）写入 `results/llm-20261029T222608/`：**88** 行；方法平均分见该目录 `latest.md`（例：M0/M5/M6/M7/M10 = **0.1250**，其余 **0.0000**）；`meta.json` 含 usage 与 `maxConcurrency: 5`。

**推荐用法（第一期）：**

- 改 harness / 方法 / pack 后：先 `npm test`，再 `npm run eval` 确认管道，再 `npm run eval:strict` 确认未误开捷径。
- 写论文或对外陈述时：**禁止**用默认 1.0 表宣称某方法更优；真实对照只引用本机跑出的 `results/llm-*/`（gitignore，需自备 key 复现）。

**下一步：** 提示/解析加固、可选启用工业园 add-on；实验节继续只引用新跑出的表。
