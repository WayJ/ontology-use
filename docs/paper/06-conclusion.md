# 6. 结论

本文（草稿）给出 ontology-use **研究脚手架**：在公开迷你 OWL/RDF 任务包上，以统一接口跑 **M0–M10**，默认 mock 烟测与严格 mock 两套可复跑结果。

**已证实（仅基于当前 `results/`）：**

1. `npm run eval` 下 M0–M10 在 **8** 个任务上平均分均为 **1.0000**、failures **0**（mock-shortcut 烟测；public-mini + foaf-lite）。
2. `npm run eval:strict` 下平均分均为 **0.0000**、每方法 failures **8**（无捷径 + 空 fixtures）。

**推荐用法（第一期）：**

- 改 harness / 方法 / pack 后：先 `npm test`，再 `npm run eval` 确认管道，再 `npm run eval:strict` 确认未误开捷径。
- 写论文或对外陈述时：**禁止**用默认 1.0 表宣称某方法更优；待真实 LLM 结果写入独立 `results/` 子目录后再做对照结论。

**下一步：** 接入显式 LLM reasoner（需密钥）、可选启用工业园 add-on；实验节同步只引用新跑出的表。
