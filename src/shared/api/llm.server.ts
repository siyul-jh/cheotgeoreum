import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { APICallError, generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output, type LanguageModel } from 'ai'
import type { z } from 'zod'
import type { LlmErrorCode, LlmResult } from '@/shared/lib/llm-result'

const LLM_TIMEOUT_MS = 60_000

// env는 호출 시점에 읽는다(모듈 스코프 금지, Spike 6)
// modelId: 기능별 모델(예: LLM_IDEAS_MODEL). 비어 있으면 LLM_MODEL
export function getModel(modelId?: string): LanguageModel {
  const { LLM_BASE_URL, LLM_API_KEY } = process.env
  const LLM_MODEL = modelId || process.env.LLM_MODEL
  if (!LLM_BASE_URL || !LLM_MODEL) throw new Error('LLM_BASE_URL 또는 LLM_MODEL이 설정되지 않았다')
  // name은 getProviderOptions의 키('llm')와 같아야 한다
  return createOpenAICompatible({ name: 'llm', baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY, supportsStructuredOutputs: true }).chatModel(LLM_MODEL)
}

// reasoning_effort는 reasoningEffort로 넘긴다. snake_case 키는 provider가 undefined로 덮어써 body에서 빠진다
// clear_thinking은 NIM이 400 "Unsupported parameter(s)"로 거부해 보내지 않는다(T0b)
export function getProviderOptions(baseURL: string): { llm: { reasoningEffort: 'low' } } | undefined {
  // ponytail: NIM 전용 파라미터. self-hosted NIM이면 조건 수정
  if (!URL.canParse(baseURL)) return undefined
  const { hostname } = new URL(baseURL)
  if (hostname !== 'nvidia.com' && !hostname.endsWith('.nvidia.com')) return undefined
  return { llm: { reasoningEffort: 'low' } }
}

function toLlmErrorCode(error: unknown): LlmErrorCode {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return 'timeout'
  if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)) return 'invalid_response'
  // 구분할 수 없는 404도 model_missing(문구에서 모델 이름과 /v1 경로를 함께 안내)
  if (APICallError.isInstance(error) && error.statusCode === 404) return 'model_missing'
  return 'llm_unreachable'
}

export async function generateStructured<T>(args: {
  model: LanguageModel
  schema: z.ZodType<T>
  system: string
  prompt: string
  temperature: number
}): Promise<LlmResult<T>> {
  try {
    const { output } = await generateText({
      model: args.model,
      system: args.system,
      prompt: args.prompt,
      temperature: args.temperature,
      output: Output.object({ schema: args.schema }),
      abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      maxRetries: 0,
      providerOptions: getProviderOptions(process.env.LLM_BASE_URL ?? ''),
    })
    return { ok: true, data: output }
  } catch (error) {
    console.error('[llm]', error)
    return { ok: false, code: toLlmErrorCode(error) }
  }
}
