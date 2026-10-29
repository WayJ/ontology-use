import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createLlmReasoner,
  LLM_MISSING_KEY_MESSAGE,
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
})
