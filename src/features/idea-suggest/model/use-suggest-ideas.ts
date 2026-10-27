import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import type { DraftError } from '@/shared/lib/llm-result'
import { suggestIdeas, SuggestIdeasInputSchema, type SuggestIdeasInput } from '../api/suggest-ideas'

export type IdeasState = { status: 'idle' | 'pending' | 'ready' | 'error'; ideas: string[]; error: DraftError | null }

export function useSuggestIdeas(): IdeasState & { request: (input: SuggestIdeasInput) => void } {
  const mutation = useMutation({ mutationFn: (data: SuggestIdeasInput) => suggestIdeas({ data }) })
  const [invalidInput, setInvalidInput] = useState(false)

  const request = (input: SuggestIdeasInput) => {
    // 클라이언트에서 먼저 검증해 서버 검증 오류가 llm_unreachable로 보이지 않게 한다
    const parsed = SuggestIdeasInputSchema.safeParse(input)
    setInvalidInput(!parsed.success)
    if (parsed.success) mutation.mutate(parsed.data)
    else mutation.reset()
  }

  const { isPending, isError, data } = mutation
  let state: IdeasState = { status: 'idle', ideas: [], error: null }
  if (invalidInput) state = { status: 'error', ideas: [], error: 'invalid_input' }
  else if (isPending) state = { status: 'pending', ideas: [], error: null }
  else if (isError) state = { status: 'error', ideas: [], error: 'llm_unreachable' }
  else if (data) state = data.ok ? { status: 'ready', ideas: data.data, error: null } : { status: 'error', ideas: [], error: data.code }
  return { ...state, request }
}
