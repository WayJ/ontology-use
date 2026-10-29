# @ontology-use/reasoners-llm

MiniMax China OpenAI-compatible reasoner (`https://api.minimax.cn/v1`).

- Default model: `MiniMax-M3.1-Flash`
- Default `max_completion_tokens`: **4096** (override with `createLlmReasoner({ maxCompletionTokens })` or env `MINIMAX_MAX_COMPLETION_TOKENS`)
- Empty `message.content` is an error; `reasoning_content` is never scored as the answer
- Concurrent API hard cap constant: `LLM_MAX_CONCURRENCY = 5`
- Never commit `MINIMAX_API_KEY`
