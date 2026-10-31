# 6. 结论

本文（草稿）给出 ontology-use **研究脚手架**：在公开迷你 OWL/RDF 任务包上，以统一接口跑 **M0–M10**，并提供 mock 烟测、严格 mock 与真实 LLM 三套可复跑结果。

**已证实（仅基于当前磁盘结果）：**

1. `npm run eval` 下 M0–M10 在 **16** 个任务上平均分均为 **1.0000**、failures **0**（mock-shortcut 烟测；public-mini + foaf-lite + org-lite）。
2. `npm run eval:strict` 下平均分均为 **0.0000**、每方法 failures **16**（无捷径 + 空 fixtures）。
3. `npm run eval -- --reasoner=llm`（MiniMax-M3.1-Flash @ api.minimax.cn）调优后写入 `results/llm-20261029T231459/`：**88** 行；领先为 **M0 / M10 = 0.9375**，**M6 = 0.1250**，方法均分约 **0.54**；`meta.json` 含 usage（total_tokens=122849）与 `maxConcurrency: 5`。调优前基线见 `results/llm-20261029T222608/`，勿混用。

**推荐用法：**

- 改 harness / 方法 / pack 后：先 `npm test`，再 `npm run eval` 确认管道，再 `npm run eval:strict` 确认未误开捷径。
- 写论文或对外陈述时：**禁止**用默认 1.0 表宣称某方法更优；真实对照只引用本机跑出的 `results/llm-*/`（gitignore，需自备 key 复现）。

**下一步：** 按方法补成本与延迟表；16 题 MiniMax 复跑（耗额度）；仓发布到 Origin 需确认。实验节继续只引用新跑出的表。相关工作 `[CITE]` 已换成真实文献（见 02-related）。
