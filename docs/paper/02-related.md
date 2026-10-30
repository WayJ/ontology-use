# 2. 相关工作

本节以真实文献为主；仍留 `[CITE: …]` 的条目定稿前再补，**不编造年份、DOI 或虚假书目**。

## 2.1 检索增强与切块 RAG

将外部文本切块检索后注入提示，是降低幻觉、引入领域事实的常用路径。本体全文或摘要亦可视为可检索语料。代表工作：Lewis 等提出 RAG，将稠密检索与 seq2seq 生成结合用于知识密集型任务（NeurIPS 2020）[Lewis et al., 2020](https://arxiv.org/abs/2005.11401)。另见 [CITE: dense retrieval / DPR]。

## 2.2 图 / 本体增强检索（GraphRAG 等）

相对纯文本块，沿实体关系取子图或路径，再生成答案，更贴近 OWL/RDF 结构。对应本矩阵 **M3 GraphRAG**、**M4 OG-RAG** 风格。OG-RAG（Sharma et al., EMNLP 2025）将领域文档映射为本体锚定超图并检索最小超边集以构造上下文：[Anthology](https://aclanthology.org/2025.emnlp-main.1674/)，[DOI](https://doi.org/10.18653/v1/2025.emnlp-main.1674)，代码 [microsoft/ograg2](https://github.com/microsoft/ograg2)。另见 [CITE: GraphRAG Microsoft]（产品/技术报告口径与学术 OG-RAG 区分）。

## 2.3 约束与校验（SHACL / 规则门）

生成后再用 SHACL 或领域规则校验，不合格则拒答或重试。对应 **M6 SHACLGate**。规范依据：W3C *Shapes Constraint Language (SHACL)* Recommendation（2017-07-20）[https://www.w3.org/TR/shacl/](https://www.w3.org/TR/shacl/)。另见 [CITE: constrained decoding / verification]。

## 2.4 工具与 MCP

把本体查询暴露为工具，由模型按需调用（**M5 ToolMCP**），或由本体导出工具 schema（**M7 Onto2Tools**）。详见 [CITE: tool-augmented LLM]、[CITE: Model Context Protocol spec]。

## 2.5 Taxonomy 对齐与 enrichment

行业共享 taxonomy 对齐 CRM、日更 enrichment / sourcing（公开实践常称 Planeteer 路径，勿与 Onto Planet 产品混淆）。对应 **M8 TaxonomyEnrich**。公开案例：[Planeteer × Currence](https://www.currence.ai/customers/planeteer-api-case-study)。另见 [CITE: taxonomy alignment]。

## 2.6 治理写回与类型化 Action

受控写回本体/知识图（Onto Planet **风格**，**M9**）与类型化 Action + 对象集（Palantir OSDK/AIP **风格**，**M10**）强调权限、提案与结构化副作用。本仓库仅做 harness 内风格适配，不调用私有 SDK。公开参考：[Palantir OSDK (osdk-ts)](https://github.com/palantir/osdk-ts/)。另见 [CITE: Onto Planet product docs]。

## 2.7 评测基准

通用 QA / 工具基准较多；**专门对照「如何用本体」的精简可复跑套件仍少**。本文以公开迷你 OWL/RDF 包 + 可自动比对金标为起点。详见 [CITE: ontology QA benchmarks]、[CITE: KGQA]。
