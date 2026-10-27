import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import type { AiDraft } from '@/entities/bucket-item'
import type { DraftState, LlmResult } from '@/shared/lib/llm-result'
import { fillBlanks, FillBlanksInputSchema, type FillBlanksInput } from '../api/fill-blanks'

export function deriveDraftState(m: {
  isPending: boolean
  isError: boolean
  data: LlmResult<AiDraft> | undefined
  invalidInput: boolean
}): DraftState {
  if (m.invalidInput) return { status: 'error', draft: null, error: 'invalid_input' }
  if (m.isPending) return { status: 'pending', draft: null, error: null }
  // 서버 함수 호출 자체의 throw(네트워크·서버 검증 실패 등)는 llm_unreachable
  if (m.isError) return { status: 'error', draft: null, error: 'llm_unreachable' }
  if (!m.data) return { status: 'idle', draft: null, error: null }
  return m.data.ok
    ? { status: 'ready', draft: m.data.data, error: null }
    : { status: 'error', draft: null, error: m.data.code }
}

export function useFillBlanks(): DraftState & { request: (input: FillBlanksInput) => void; reset: () => void } {
  const mutation = useMutation({ mutationFn: (data: FillBlanksInput) => fillBlanks({ data }) })
  const [invalidInput, setInvalidInput] = useState(false)

  const request = (input: FillBlanksInput) => {
    // 클라이언트에서 먼저 검증해 서버 검증 오류가 llm_unreachable로 보이지 않게 한다
    const parsed = FillBlanksInputSchema.safeParse(input)
    setInvalidInput(!parsed.success)
    if (parsed.success) mutation.mutate(parsed.data)
    else mutation.reset()
  }

  const reset = () => {
    setInvalidInput(false)
    mutation.reset()
  }

  return { ...deriveDraftState({ ...mutation, invalidInput }), request, reset }
}
