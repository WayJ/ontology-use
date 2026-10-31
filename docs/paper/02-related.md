# 2. 相关工作

本节以真实文献与公开规范为主；**不编造年份、DOI 或虚假书目**。

## 2.1 检索增强与切块 RAG

将外部文本切块检索后注入提示，是降低幻觉、引入领域事实的常用路径。本体全文或摘要亦可视为可检索语料。代表工作：Lewis 等提出 RAG，将稠密检索与 seq2seq 生成结合用于知识密集型任务（NeurIPS 2020）[Lewis et al., 2020](https://arxiv.org/abs/2005.11401)。稠密检索侧：Karpukhin 等的 Dense Passage Retrieval（DPR，EMNLP 2020）用双编码器学习问题与段落表示，并以内积检索替代纯稀疏匹配 [Karpukhin et al., 2020](https://arxiv.org/abs/2004.04906)。

## 2.2 图 / 本体增强检索（GraphRAG 等）

相对纯文本块，沿实体关系取子图或路径，再生成答案，更贴近 OWL/RDF 结构。对应本矩阵 **M3 GraphRAG**、**M4 OG-RAG** 风格。OG-RAG（Sharma et al., EMNLP 2025）将领域文档映射为本体锚定超图并检索最小超边集以构造上下文：[Anthology](https://aclanthology.org/2025.emnlp-main.1674/)，[DOI](https://doi.org/10.18653/v1/2025.emnlp-main.1674)，代码 [microsoft/ograg2](https://github.com/microsoft/ograg2)。产品/技术报告口径的 Microsoft GraphRAG（Edge et al., arXiv:2404.16130）从文档导出实体图与社区摘要再做 query-focused 汇总，与学术 OG-RAG 需区分：[From Local to Global](https://arxiv.org/abs/2404.16130)，开源 [microsoft/graphrag](https://github.com/microsoft/graphrag)。

## 2.3 约束与校验（SHACL / 规则门）

生成后再用 SHACL 或领域规则校验，不合格则拒答或重试。对应 **M6 SHACLGate**。规范依据：W3C *Shapes Constraint Language (SHACL)* Recommendation（2017-07-20）[https://www.w3.org/TR/shacl/](https://www.w3.org/TR/shacl/)。生成侧约束解码示例：NeuroLogic A\*esque（Lu et al., NAACL 2022）用前瞻启发式满足逻辑/词汇约束 [Anthology](https://aclanthology.org/2022.naacl-main.57/)。事后一致性校验示例：SelfCheckGPT（Manakul et al., EMNLP 2023）在无外部知识库时用多样本一致性检测幻觉 [arXiv:2303.08896](https://arxiv.org/abs/2303.08896)。

## 2.4 工具与 MCP

把本体查询暴露为工具，由模型按需调用（**M5 ToolMCP**），或由本体导出工具 schema（**M7 Onto2Tools**）。工具增强 LLM 代表：Toolformer（Schick et al., 2023）自学何时调用外部 API [arXiv:2302.04761](https://arxiv.org/abs/2302.04761)；ReAct（Yao et al., ICLR 2023）交错推理轨迹与环境动作 [arXiv:2210.03629](https://arxiv.org/abs/2210.03629)。协议侧：Model Context Protocol（MCP）以 JSON-RPC 暴露工具/资源/提示，规范见 [modelcontextprotocol.io/specification/2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)。

## 2.5 Taxonomy 对齐与 enrichment

行业共享 taxonomy 对齐 CRM、日更 enrichment / sourcing（公开实践常称 Planeteer 路径，勿与 Onto Planet 产品混淆）。对应 **M8 TaxonomyEnrich**。公开案例：[Planeteer × Currence](https://www.currence.ai/customers/planeteer-api-case-study)。本体/模式匹配评测传统见 Ontology Alignment Evaluation Initiative（OAEI）[oaei.ontologymatching.org](https://oaei.ontologymatching.org/)。

## 2.6 治理写回与类型化 Action

受控写回本体/知识图（Onto Planet **风格**，**M9**）与类型化 Action + 对象集（Palantir OSDK/AIP **风格**，**M10**）强调权限、提案与结构化副作用。本仓库仅做 harness 内风格适配，不调用私有 SDK。公开参考：[Palantir OSDK (osdk-ts)](https://github.com/palantir/osdk-ts/)；Onto Planet 产品主页（Ontology Studio + Agent OS，公开文档有限）[ontoplanet.com](https://ontoplanet.com/)。

## 2.7 评测基准

通用 QA / 工具基准较多；**专门对照「如何用本体」的精简可复跑套件仍少**。本文以公开迷你 OWL/RDF 包 + 可自动比对金标为起点。知识图问答侧：LC-QuAD（Trivedi / Dubey 等，ISWC 2017）提供 DBpedia 上复杂自然语言问与 SPARQL 对 [论文 PDF](https://jens-lehmann.org/files/2017/iswc_lcquad.pdf)；社区汇总见 [KGQA leaderboard](https://github.com/KGQA/leaderboard/)。QALD 系列则是面向 Linked Data 的多语种评测活动（见同 leaderboard 的 QALD 条目）。这些偏「图上问答」，与本仓库「同一本体任务集上对照挂载方法」目标相邻但不等同。
