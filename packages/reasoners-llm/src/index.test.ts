import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createLlmReasoner,
  LLM_MISSING_KEY_MESSAGE,
  LLM_MAX_CONCURRENCY,
} from './index.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createLlmReasoner', () => {
  it('throws LLM_MISSING_KEY_MESSAGE when apiKey is empty', () => {
    expect(() => createLlmReasoner({ apiKey: '' })).toThrow(
      LLM_MISSING_KEY_MESSAGE,
    )
    expect(LLM_MISSING_KEY_MESSAGE).toBe(
      'MINIMAX_API_KEY is required for --reasoner=llm',
    )
  })

  it('complete returns message.content on mocked 200', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: 'ok' } }],
      }),
    )
    const r = createLlmReasoner({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(r.id).toBe('llm')
    await expect(r.complete('hi')).resolves.toBe('ok')
  })

  it('rejects when content is empty', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: '', reasoning_content: 'think' } }],
      }),
    )
    const r = createLlmReasoner({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await expect(r.complete('hi')).rejects.toThrow(/empty|content/i)
  })

  it('rejects including status on 401', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    const r = createLlmReasoner({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await expect(r.complete('hi')).rejects.toThrow(/401/)
  })

  it('POSTs to baseUrl/chat/completions with Bearer and user message', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: 'pong' } }],
      }),
    )
    const baseUrl = 'https://example.test/v1'
    const r = createLlmReasoner({
      apiKey: 'secret-key',
      baseUrl,
      model: 'MiniMax-M3.1-Flash',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await r.complete('hello prompt')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe(`${baseUrl}/chat/completions`)
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization ?? headers.authorization).toBe(
      'Bearer secret-key',
    )
    const body = JSON.parse(String(init?.body))
    expect(body.model).toBe('MiniMax-M3.1-Flash')
    expect(body.messages).toEqual([
      { role: 'user', content: 'hello prompt' },
    ])
  })

  it('defaults max_completion_tokens to 4096 in the request body', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: 'pong' } }],
      }),
    )
    const r = createLlmReasoner({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await r.complete('hi')
    const body = JSON.parse(String(fetchImpl.mock.calls[0]![1]?.body))
    expect(body.max_completion_tokens).toBe(4096)
  })

  it('allows overriding max_completion_tokens', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: 'pong' } }],
      }),
    )
    const r = createLlmReasoner({
      apiKey: 'test-key',
      maxCompletionTokens: 64,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await r.complete('hi')
    const body = JSON.parse(String(fetchImpl.mock.calls[0]![1]?.body))
    expect(body.max_completion_tokens).toBe(64)
  })

  it('rejects empty content even when reasoning_content present and includes finish_reason', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [
          {
            finish_reason: 'length',
            message: { content: '', reasoning_content: 'think' },
          },
        ],
      }),
    )
    const r = createLlmReasoner({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await expect(r.complete('hi')).rejects.toThrow(/empty|content/i)
    await expect(r.complete('hi')).rejects.toThrow(/finish_reason=length/)
  })

  it('honors MINIMAX_MAX_COMPLETION_TOKENS env when opts omit maxCompletionTokens', async () => {
    const prev = process.env.MINIMAX_MAX_COMPLETION_TOKENS
    process.env.MINIMAX_MAX_COMPLETION_TOKENS = '1024'
    try {
      const fetchImpl = vi.fn(async () =>
        Response.json({ choices: [{ message: { content: 'pong' } }] }),
      )
      const r = createLlmReasoner({
        apiKey: 'test-key',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      await r.complete('hi')
      const body = JSON.parse(String(fetchImpl.mock.calls[0]![1]?.body))
      expect(body.max_completion_tokens).toBe(1024)
    } finally {
      if (prev === undefined) delete process.env.MINIMAX_MAX_COMPLETION_TOKENS
      else process.env.MINIMAX_MAX_COMPLETION_TOKENS = prev
    }
  })

  it('exports LLM_MAX_CONCURRENCY hard cap of 5', () => {
    expect(LLM_MAX_CONCURRENCY).toBe(5)
  })
})
