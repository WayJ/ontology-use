# 4. 实验

> **引用规则：** 本节数字一律来自仓库磁盘上**当前**的 `results/latest.md` 与 `results/strict/latest.md`。未跑出的数字不写。复跑：`npm run eval` / `npm run eval:strict`。

## 4.1 设置

- **Pack：** `packages/packs-public-mini`（启用），5 个任务（exact / set / fields），金标为 IRI 或结构化字段，可自动打分。
- **方法：** M0–M10（11 个）。
- **Reasoner：** 确定性 mock（零网络）。
- **指标：** 任务级 exact / 集合 F1 / fields 字段平均；表中为方法平均分、任务数、失败数。

## 4.2 默认评测（mock-shortcut 烟测）

命令：`npm run eval` → `results/latest.md`

**警告：默认模式启用 mock-shortcut（按金标形状直接给分），用于验证「加载→跑方法→打分→写表」管道，不是真实 LLM 能力排名，方法之间不可据此比优劣。**

摘录（磁盘现值）：

| method | avg score | tasks | failures |
| --- | ---: | ---: | ---: |
| M0 | 1.0000 | 5 | 0 |
| M1 | 1.0000 | 5 | 0 |
| M2 | 1.0000 | 5 | 0 |
| M3 | 1.0000 | 5 | 0 |
| M4 | 1.0000 | 5 | 0 |
| M5 | 1.0000 | 5 | 0 |
| M6 | 1.0000 | 5 | 0 |
| M7 | 1.0000 | 5 | 0 |
| M8 | 1.0000 | 5 | 0 |
| M9 | 1.0000 | 5 | 0 |
| M10 | 1.0000 | 5 | 0 |

解读：11 个方法 × 5 任务均成功（failures=0），平均分均为 1.0——与 shortcut 设计一致。

## 4.3 严格 mock（无捷径）

命令：`npm run eval:strict` → `results/strict/latest.md`

无 fixtures 映射时，reasoner 返回 `MOCK:<hash>`，与金标不匹配。磁盘现值：

| method | avg score | tasks | failures |
| --- | ---: | ---: | ---: |
| M0 | 0.0000 | 5 | 5 |
| M1 | 0.0000 | 5 | 5 |
| M2 | 0.0000 | 5 | 5 |
| M3 | 0.0000 | 5 | 5 |
| M4 | 0.0000 | 5 | 5 |
| M5 | 0.0000 | 5 | 5 |
| M6 | 0.0000 | 5 | 5 |
| M7 | 0.0000 | 5 | 5 |
| M8 | 0.0000 | 5 | 5 |
| M9 | 0.0000 | 5 | 5 |
| M10 | 0.0000 | 5 | 5 |

解读：严格模式全员 0 分、每方法 5 次失败计数——说明捷径已关闭，打分器在拒绝错误答案；**仍不能**解释为某方法「更差」，因尚未接入真实 LLM。

## 4.4 后续（未跑，不报数）

真实 LLM reasoner、更大公开本体包、工业园 add-on：待实现后再引用新的 `results/` 目录。
