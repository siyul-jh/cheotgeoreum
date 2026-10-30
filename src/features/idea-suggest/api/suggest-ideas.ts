import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { fieldLimits } from '@/entities/bucket-item'

export const IdeasOutputSchema = z.object({ ideas: z.array(z.string()).min(5) }) // 프롬프트는 8개 요청
export const SuggestIdeasInputSchema = z.object({
  keyword: z.string().trim().max(fieldLimits.keyword).optional(),
  category: z.string().max(fieldLimits.category).optional(),
  existingTitles: z.array(z.string().max(fieldLimits.title)).max(500), // 클라이언트 slice(-500)
})
export type SuggestIdeasInput = z.infer<typeof SuggestIdeasInputSchema>

// 서버 전용 모듈은 handler 안에서만 동적 import한다(Spike 8: client 번들에서 제거됨)
export const suggestIdeas = createServerFn({ method: 'POST' })
  .validator(SuggestIdeasInputSchema)
  .handler(async ({ data }) => {
    const [{ runSuggestIdeas }, { getModel }] = await Promise.all([
      import('./suggest-ideas.server'),
      import('@/shared/api/llm.server'),
    ])
    return runSuggestIdeas(data, getModel(process.env.LLM_IDEAS_MODEL))
  })
