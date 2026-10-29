# ontology-use 论文骨架（中文）

**定位：** 研究项目交付物——评测基准 + 方法矩阵对照 + 论文草稿。**不是**面向 Agent 的 SDK/MCP 产品。

| 章节 | 文件 |
|------|------|
| 问题与目标 | [01-problem.md](./01-problem.md) |
| 相关工作 | [02-related.md](./02-related.md) |
| 方法矩阵 M0–M10 | [03-methods.md](./03-methods.md) |
| 实验 | [04-experiments.md](./04-experiments.md) |
| 讨论 | [05-discussion.md](./05-discussion.md) |
| 结论 | [06-conclusion.md](./06-conclusion.md) |

## 如何复跑实验数字

论文实验节**只**引用仓库内 `results/` 本次跑出的表。复跑：

```bash
npm i
npm test
npm run eval          # → results/latest.md（默认 mock-shortcut 烟测）
npm run eval:strict   # → results/strict/latest.md（无金标捷径）
```

规格见 `docs/superpowers/specs/2026-10-29-ontology-use-harness-design.md`；产品定位见根目录 `PRODUCT.md`。
