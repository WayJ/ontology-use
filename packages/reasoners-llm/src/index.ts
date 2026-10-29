import type { Reasoner } from '@ontology-use/core'

export const LLM_MISSING_KEY_MESSAGE =
  'MINIMAX_API_KEY is required for --reasoner=llm'

/** Hard cap for MiniMax concurrent chat completions (user constraint). runEval stays sequential (=1). */
export const LLM_MAX_CONCURRENCY = 5

const DEFAULT_BASE_URL = 'https://api.minimax.cn/v1'
const DEFAULT_MODEL = 'MiniMax-M3.1-Flash'

export type LlmReasonerOptions = {
  apiKey?: string
  baseUrl?: string
  model?: string
  fetchImpl?: typeof fetch
  maxCompletionTokens?: number
}

export type TokenUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export type LlmReasoner = Reasoner & {
  getUsageTotals(): TokenUsage
}

function resolveApiKey(opts?: LlmReasonerOptions): string {
  const key = opts?.apiKey ?? process.env.MINIMAX_API_KEY ?? ''
  if (!key) {
    throw new Error(LLM_MISSING_KEY_MESSAGE)
  }
  return key
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export function createLlmReasoner(opts?: LlmReasonerOptions): LlmReasoner {
  const apiKey = resolveApiKey(opts)
  const baseUrl = stripTrailingSlash(
    opts?.baseUrl ?? process.env.MINIMAX_BASE_URL ?? DEFAULT_BASE_URL,
  )
  const model = opts?.model ?? process.env.MINIMAX_MODEL ?? DEFAULT_MODEL
  const fetchImpl = opts?.fetchImpl ?? globalThis.fetch
  const maxCompletionTokens = opts?.maxCompletionTokens ?? 2048

  const usageTotals: TokenUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  }

  return {
    id: 'llm',
    getUsageTotals() {
      return { ...usageTotals }
    },
    async complete(prompt: string): Promise<string> {
      const url = `${baseUrl}/chat/completions`
      const body: Record<string, unknown> = {
        model,
        messages: [{ role: 'user', content: prompt }],
      }
      if (maxCompletionTokens !== undefined) {
        body.max_completion_tokens = maxCompletionTokens
      }

      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const rawText = await res.text()
      if (!res.ok) {
        const truncated =
          rawText.length > 500 ? `${rawText.slice(0, 500)}…` : rawText
        throw new Error(
          `MiniMax chat/completions failed: HTTP ${res.status} ${truncated}`,
        )
      }

      let data: {
        choices?: Array<{
          message?: { content?: string | null; reasoning_content?: string }
        }>
        usage?: Partial<TokenUsage>
      }
      try {
        data = JSON.parse(rawText) as typeof data
      } catch {
        throw new Error('MiniMax chat/completions returned non-JSON body')
      }

      const usage = data.usage
      if (usage) {
        usageTotals.prompt_tokens += Number(usage.prompt_tokens ?? 0)
        usageTotals.completion_tokens += Number(usage.completion_tokens ?? 0)
        usageTotals.total_tokens += Number(usage.total_tokens ?? 0)
      }

      const content = data.choices?.[0]?.message?.content
      if (content == null || String(content).trim() === '') {
        throw new Error(
          'MiniMax returned empty message.content (do not use reasoning_content as the answer; try higher max_completion_tokens)',
        )
      }
      return String(content)
    },
  }
}
