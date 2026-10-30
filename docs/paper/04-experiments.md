# 4. 实验

> **引用规则：** 本节数字一律来自仓库磁盘上**当前**的结果文件。未跑出的数字不写。复跑：`npm run eval` / `npm run eval:strict` / `npm run eval -- --reasoner=llm`（需 `MINIMAX_API_KEY`；写入 `results/llm-<stamp>/`，已 gitignore）。

## 4.1 设置

- **Packs（均 `enabled: true`）：**
  - `packages/packs-public-mini` — 7 任务（exact / set / fields）
  - `packages/packs-public-foaf-lite` — 5 任务（exact / set / fields；FOAF 风格灵感，`example.org` IRI）
  - `packages/packs-public-org-lite` — 4 任务（exact / set / fields；Organization / Employee / Role，`example.org` IRI）
  - 合计 **16** 个可自动打分任务；工业园 pack 仍为 `enabled: false`，不进默认评测。
- **方法：** M0–M10（11 个）。
- **Reasoner：** 确定性 mock（零网络）。
- **指标：** 任务级 exact / 集合 F1 / fields 字段平均；表中为方法平均分、任务数、失败数。

## 4.2 默认评测（mock-shortcut 烟测）

命令：`npm run eval` → `results/latest.md`（本轮 **176** 行 = 11 方法 × 16 任务）

**警告：默认模式启用 mock-shortcut（按金标形状直接给分），用于验证「加载→跑方法→打分→写表」管道，不是真实 LLM 能力排名，方法之间不可据此比优劣。**

摘录（磁盘现值）：

| method | avg score | tasks | failures |
| --- | ---: | ---: | ---: |
| M0 | 1.0000 | 16 | 0 |
| M1 | 1.0000 | 16 | 0 |
| M2 | 1.0000 | 16 | 0 |
| M3 | 1.0000 | 16 | 0 |
| M4 | 1.0000 | 16 | 0 |
| M5 | 1.0000 | 16 | 0 |
| M6 | 1.0000 | 16 | 0 |
| M7 | 1.0000 | 16 | 0 |
| M8 | 1.0000 | 16 | 0 |
| M9 | 1.0000 | 16 | 0 |
| M10 | 1.0000 | 16 | 0 |

解读：11 个方法 × 16 任务均成功（failures=0），平均分均为 1.0——与 shortcut 设计一致。

## 4.3 严格 mock（无捷径）

命令：`npm run eval:strict` → `results/strict/latest.md`

无 fixtures 映射时，reasoner 返回 `MOCK:<hash>`，与金标不匹配。磁盘现值：

| method | avg score | tasks | failures |
| --- | ---: | ---: | ---: |
| M0 | 0.0000 | 16 | 16 |
| M1 | 0.0000 | 16 | 16 |
| M2 | 0.0000 | 16 | 16 |
| M3 | 0.0000 | 16 | 16 |
| M4 | 0.0000 | 16 | 16 |
| M5 | 0.0000 | 16 | 16 |
| M6 | 0.0000 | 16 | 16 |
| M7 | 0.0000 | 16 | 16 |
| M8 | 0.0000 | 16 | 16 |
| M9 | 0.0000 | 16 | 16 |
| M10 | 0.0000 | 16 | 16 |

解读：严格模式全员 0 分、每方法 16 次失败计数——说明捷径已关闭，打分器在拒绝错误答案；**仍不能**解释为某方法「更差」，因尚未接入真实 LLM。

## 4.4 LLM run（MiniMax CN）

命令：`npm run eval -- --reasoner=llm`（需环境变量 `MINIMAX_API_KEY`；可选 `MINIMAX_BASE_URL` / `MINIMAX_MODEL`）

- **Provider / endpoint：** `https://api.minimax.cn/v1`（OpenAI-compatible chat/completions）
- **Model：** `MiniMax-M3.1-Flash`
- **Concurrency：** hard cap `maxConcurrency: 5`（当前 `runEval` 串行，live = 1）；勿无信号量并行
- **输出目录（本轮磁盘）：** `results/llm-20261029T231459/`（`latest.md` / `latest.json` / `meta.json`；**不入库**，见 `.gitignore`）
- **meta.json（本轮）：** `usageTotals` prompt_tokens=32486, completion_tokens=90363, total_tokens=122849；`maxConcurrency: 5`；`startedAt` 2026-10-29T15:14:59.983Z
- **对照旧跑：** `results/llm-20261029T222608/` 为 prompt/IRI 调优与 `max_completion_tokens=4096` **之前**的基线（多数方法 ≈0–0.125），勿与本表混用。

摘录（来自本轮 `latest.md`，**不是** mock-shortcut，可用于方法对照）：

| method | avg score | tasks | failures |
| --- | ---: | ---: | ---: |
| M0 | 0.9375 | 8 | 1 |
| M1 | 0.6875 | 8 | 3 |
| M2 | 0.5208 | 8 | 5 |
| M3 | 0.6250 | 8 | 4 |
| M4 | 0.5000 | 8 | 5 |
| M5 | 0.3542 | 8 | 7 |
| M6 | 0.1250 | 8 | 7 |
| M7 | 0.5208 | 8 | 5 |
| M8 | 0.3125 | 8 | 6 |
| M9 | 0.4375 | 8 | 5 |
| M10 | 0.9375 | 8 | 1 |

行数：88（11×8）。本轮在 `feat/llm-prompt-iri-tune` 上：输出契约 footer、解析加固、默认 `max_completion_tokens=4096`。领先为 **M0 PromptDump** 与 **M10 ActionSDK**（均为 0.9375）；**M6 SHACLGate** 仍最低（0.1250）。单次跑、单模型，不作跨厂商泛化结论。

> **Pack 增长说明（本仓库后续）：** 默认公开 pack 已扩至 **16** 任务（+`public-org-lite` 等；见 §4.1）。上表仍为扩 pack **之前**的 8 任务 MiniMax 跑（`results/llm-20261029T231459/`），**未**在 16 任务集上复跑；勿把上表 tasks=8 与当前默认 mock 的 16 任务混为同一次评测。


## 4.5 后续

默认公开 pack 已扩至 16 任务（mini 7 + foaf-lite 5 + org-lite 4）。工业园 add-on 启用、16 任务集上的 MiniMax/多模型复跑与成本/延迟指标：待实现后再引用新表。
