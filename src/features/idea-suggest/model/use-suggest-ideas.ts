import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { deriveDraftState, type DraftState } from '@/shared/lib/llm-result'
import { suggestIdeas, SuggestIdeasInputSchema, type SuggestIdeasInput } from '../api/suggest-ideas'

export function useSuggestIdeas(): Omit<DraftState<string[]>, 'draft'> & {
  ideas: string[]
  request: (input: SuggestIdeasInput) => void
} {
  const mutation = useMutation({ mutationFn: (data: SuggestIdeasInput) => suggestIdeas({ data }) })
  const [invalidInput, setInvalidInput] = useState(false)

  const request = (input: SuggestIdeasInput) => {
    // 클라이언트에서 먼저 검증해 서버 검증 오류가 llm_unreachable로 보이지 않게 한다
    const parsed = SuggestIdeasInputSchema.safeParse(input)
    setInvalidInput(!parsed.success)
    if (parsed.success) mutation.mutate(parsed.data)
    else mutation.reset()
  }

  const { draft, ...state } = deriveDraftState({ ...mutation, invalidInput })
  return { ...state, ideas: draft ?? [], request }
}
