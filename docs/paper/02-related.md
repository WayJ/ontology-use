# 2. 相关工作

本节仅列方向与占位引用标记；**不编造年份、DOI 或虚假书目**。定稿前用 `[CITE: …]` 替换为真实文献。

## 2.1 检索增强与切块 RAG

将外部文本切块检索后注入提示，是降低幻觉、引入领域事实的常用路径。本体全文或摘要亦可视为可检索语料。详见 [CITE: RAG survey]、[CITE: dense retrieval]。

## 2.2 图 / 本体增强检索（GraphRAG 等）

相对纯文本块，沿实体关系取子图或路径，再生成答案，更贴近 OWL/RDF 结构。对应本矩阵 **M3 GraphRAG**、**M4 OG-RAG** 风格。详见 [CITE: GraphRAG]、[CITE: ontology-guided generation]。

## 2.3 约束与校验（SHACL / 规则门）

生成后再用 SHACL 或领域规则校验，不合格则拒答或重试。对应 **M6 SHACLGate**。详见 [CITE: SHACL]、[CITE: constrained decoding / verification]。

## 2.4 工具与 MCP

把本体查询暴露为工具，由模型按需调用（**M5 ToolMCP**），或由本体导出工具 schema（**M7 Onto2Tools**）。详见 [CITE: tool-augmented LLM]、[CITE: MCP]。

## 2.5 Taxonomy 对齐与 enrichment

行业共享 taxonomy 对齐 CRM、日更 enrichment / sourcing（公开实践常称 Planeteer 路径，勿与 Onto Planet 产品混淆）。对应 **M8 TaxonomyEnrich**。详见 [CITE: Planeteer / Currence case]、[CITE: taxonomy alignment]。

## 2.6 治理写回与类型化 Action

受控写回本体/知识图（Onto Planet **风格**，**M9**）与类型化 Action + 对象集（Palantir OSDK/AIP **风格**，**M10**）强调权限、提案与结构化副作用。本仓库仅做 harness 内风格适配，不调用私有 SDK。详见 [CITE: Onto Planet]、[CITE: Ontology SDK / AIP actions]。

## 2.7 评测基准

通用 QA / 工具基准较多；**专门对照「如何用本体」的精简可复跑套件仍少**。本文以公开迷你 OWL/RDF 包 + 可自动比对金标为起点。详见 [CITE: ontology QA benchmarks]、[CITE: KGQA]。
