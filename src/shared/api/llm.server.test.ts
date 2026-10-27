// @vitest-environment node
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { APICallError } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { generateStructured, getModel, getProviderOptions } from './llm.server'

const schema = z.object({ answer: z.string() })
const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
const textModel = (text: string) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: undefined },
      usage,
      warnings: [],
    }),
  })
const throwingModel = (error: unknown) =>
  new MockLanguageModelV4({
    doGenerate: async () => {
      throw error
    },
  })
const run = (model: MockLanguageModelV4) => generateStructured({ model, schema, system: 's', prompt: 'p', temperature: 0 })

// T0b 실측(2026-10-27, NIM integrate.api.nvidia.com). APICallError.message는 모두 ''였다. 403은 미측정 가정값
const URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const apiError = (statusCode: number, responseBody: string) =>
  new APICallError({ message: '', url: URL, requestBodyValues: {}, statusCode, responseBody })
const econnrefused = new APICallError({
  message: 'Cannot connect to API: connect ECONNREFUSED 127.0.0.1:11434',
  url: URL,
  requestBodyValues: {},
  cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:11434'), { code: 'ECONNREFUSED' }),
  isRetryable: true,
})
const enotfound = new APICallError({
  message: 'Cannot connect to API: getaddrinfo ENOTFOUND llm.invalid',
  url: 'https://llm.invalid/v1/chat/completions',
  requestBodyValues: {},
  cause: Object.assign(new Error('getaddrinfo ENOTFOUND llm.invalid'), { code: 'ENOTFOUND' }),
  isRetryable: true,
})

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('generateStructured', () => {
  it('정상 응답이면 ok', async () => {
    expect(await run(textModel('{"answer":"네"}'))).toEqual({ ok: true, data: { answer: '네' } })
  })
  it('스키마와 맞지 않는 JSON이면 invalid_response', async () => {
    expect(await run(textModel('{"answer":1}'))).toEqual({ ok: false, code: 'invalid_response' })
  })
  it('JSON이 아니면 invalid_response', async () => {
    expect(await run(textModel('<think>음</think> 답'))).toEqual({ ok: false, code: 'invalid_response' })
  })
  it.each([
    ['TimeoutError', new DOMException('The operation was aborted due to timeout', 'TimeoutError')],
    ['AbortError', new DOMException('This operation was aborted', 'AbortError')],
  ])('%s이면 timeout', async (_, error) => {
    expect(await run(throwingModel(error))).toEqual({ ok: false, code: 'timeout' })
  })
  it.each([
    ['잘못된 모델', apiError(404, '404 page not found\n')],
    ['/v1 누락', apiError(404, '')],
  ])('404(%s)이면 model_missing', async (_, error) => {
    expect(await run(throwingModel(error))).toEqual({ ok: false, code: 'model_missing' })
  })
  it.each([
    ['400', apiError(400, '{"message":"Validation: Unsupported parameter(s): `clear_thinking`","type":"Bad Request","code":400}')],
    ['401', apiError(401, '{"status":401,"title":"Unauthorized","detail":"Invalid JWT serialization: Missing dot delimiter(s)"}')],
    ['403', apiError(403, '{"status":403,"title":"Forbidden"}')],
    ['429', apiError(429, '{"status":429,"title":"Too Many Requests"}')],
    ['ECONNREFUSED', econnrefused],
    ['ENOTFOUND', enotfound],
    ['fetch failed', new TypeError('fetch failed')],
    ['알 수 없는 오류', new Error('boom')],
  ])('%s이면 llm_unreachable', async (_, error) => {
    expect(await run(throwingModel(error))).toEqual({ ok: false, code: 'llm_unreachable' })
  })
  it('NIM이면 providerOptions가 요청 body에 들어간다', async () => {
    vi.stubEnv('LLM_BASE_URL', 'https://integrate.api.nvidia.com/v1')
    let body: Record<string, unknown> = {}
    const model = createOpenAICompatible({
      name: 'llm',
      baseURL: 'https://integrate.api.nvidia.com/v1',
      fetch: async (_, init) => {
        body = JSON.parse(String(init?.body))
        return Response.json({
          id: '1',
          created: 0,
          model: 'm',
          choices: [{ index: 0, message: { role: 'assistant', content: '{"answer":"네"}' }, finish_reason: 'stop' }],
        })
      },
    }).chatModel('m')
    expect(await generateStructured({ model, schema, system: 's', prompt: 'p', temperature: 0 })).toEqual({ ok: true, data: { answer: '네' } })
    expect(body).toMatchObject({ reasoning_effort: 'low' })
    // T0b: NIM이 clear_thinking을 400(Unsupported parameter)으로 거부한다
    expect(body).not.toHaveProperty('clear_thinking')
  })
})

describe('getProviderOptions', () => {
  it('NIM 호스트면 객체', () => {
    expect(getProviderOptions('https://integrate.api.nvidia.com/v1')).toEqual({
      llm: { reasoningEffort: 'low' },
    })
  })
  it('nvidia.com 자체도 NIM', () => {
    expect(getProviderOptions('https://nvidia.com/v1')).toEqual({ llm: { reasoningEffort: 'low' } })
  })
  it('nvidia.com으로 끝나기만 하는 다른 도메인이면 undefined', () => {
    expect(getProviderOptions('https://evilnvidia.com/v1')).toBeUndefined()
  })
  it('로컬이면 undefined', () => {
    expect(getProviderOptions('http://localhost:11434/v1')).toBeUndefined()
  })
  it('잘못된 URL이면 undefined', () => {
    expect(getProviderOptions('not a url')).toBeUndefined()
  })
})

describe('getModel', () => {
  it('LLM_BASE_URL이나 LLM_MODEL이 없으면 throw', () => {
    vi.stubEnv('LLM_BASE_URL', '')
    vi.stubEnv('LLM_MODEL', 'm')
    expect(() => getModel()).toThrow()
  })
})
