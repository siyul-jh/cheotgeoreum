import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { TargetPeriodSchema, type AiDraft } from '@/entities/bucket-item'
import { deriveDraftState, type DraftState } from '@/shared/lib/llm-result'
import { fillBlanks, FillBlanksInputSchema, type FillBlanksInput } from '../api/fill-blanks'

export function useFillBlanks(): DraftState<AiDraft> & { request: (input: FillBlanksInput) => void; reset: () => void } {
  const mutation = useMutation({ mutationFn: (data: FillBlanksInput) => fillBlanks({ data }) })
  const [invalidInput, setInvalidInput] = useState(false)

  const request = (input: FillBlanksInput) => {
    // 클라이언트에서 먼저 검증해 서버 검증 오류가 llm_unreachable로 보이지 않게 한다
    // 덜 채운 기간(시작 없음·역순)은 비운 채 보낸다. 그대로면 기간 하나 때문에 요청 전체가 입력 오류가 된다
    const period = input.item.targetPeriod
    const item = period && !TargetPeriodSchema.safeParse(period).success ? { ...input.item, targetPeriod: null } : input.item
    const parsed = FillBlanksInputSchema.safeParse({ ...input, item })
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
