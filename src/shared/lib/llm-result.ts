export type LlmErrorCode = 'llm_unreachable' | 'model_missing' | 'timeout' | 'invalid_response'
export type LlmResult<T> = { ok: true; data: T } | { ok: false; code: LlmErrorCode }
export type DraftStatus = 'idle' | 'pending' | 'ready' | 'error'
export type DraftError = LlmErrorCode | 'invalid_input'
export type DraftState<T> = { status: DraftStatus; draft: T | null; error: DraftError | null }

export function deriveDraftState<T>(m: {
  isPending: boolean
  isError: boolean
  data: LlmResult<T> | undefined
  invalidInput: boolean
}): DraftState<T> {
  if (m.invalidInput) return { status: 'error', draft: null, error: 'invalid_input' }
  if (m.isPending) return { status: 'pending', draft: null, error: null }
  // 서버 함수 호출 자체의 throw(네트워크·서버 검증 실패 등)는 llm_unreachable
  if (m.isError) return { status: 'error', draft: null, error: 'llm_unreachable' }
  if (!m.data) return { status: 'idle', draft: null, error: null }
  return m.data.ok
    ? { status: 'ready', draft: m.data.data, error: null }
    : { status: 'error', draft: null, error: m.data.code }
}

export const LLM_ERROR_MESSAGES: Record<DraftError, string> = {
  llm_unreachable: 'AI 서버에 연결하지 못했어요. LLM_BASE_URL·API 키·사용 한도를 확인해 주세요. 직접 입력은 계속할 수 있어요.',
  model_missing: '모델을 찾을 수 없어요. LLM_MODEL 이름과 LLM_BASE_URL 경로(/v1)를 확인해 주세요.',
  timeout: 'AI 응답이 60초 안에 오지 않았어요. 다시 시도하거나 직접 입력해 주세요.',
  invalid_response: 'AI 응답 형식이 올바르지 않아요. 다시 시도해 주세요.',
  invalid_input: '입력값이 너무 길거나 형식이 맞지 않아 AI에 보낼 수 없어요.',
}
