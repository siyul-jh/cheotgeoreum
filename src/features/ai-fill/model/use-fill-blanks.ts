import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import type { AiDraft } from '@/entities/bucket-item'
import { deriveDraftState, type DraftState } from '@/shared/lib/llm-result'
import { fillBlanks, FillBlanksInputSchema, type FillBlanksInput } from '../api/fill-blanks'

export function useFillBlanks(): DraftState<AiDraft> & { request: (input: FillBlanksInput) => void; reset: () => void } {
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
