import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { COMPANION_PRESETS, fieldLimits } from '@/entities/bucket-item'

export const IdeasOutputSchema = z.object({ ideas: z.array(z.string()).min(5) }) // 프롬프트는 8개 요청
export const SuggestIdeasInputSchema = z.object({
  keyword: z.string().trim().max(fieldLimits.keyword).optional(),
  category: z.string().max(fieldLimits.category).optional(),
  existingTitles: z.array(z.string().max(fieldLimits.title)).max(500), // 클라이언트 slice(-500)
  // 내 꿈 맞춤: 자주 쓴 카테고리, 함께한 사람 종류(기본 선택지만. 사람 이름은 보내지 않는다)
  topCategories: z.array(z.string().max(fieldLimits.category)).max(3).default([]),
  companions: z.array(z.enum(COMPANION_PRESETS)).max(COMPANION_PRESETS.length).default([]),
})
export type SuggestIdeasInput = z.input<typeof SuggestIdeasInputSchema> // 맞춤 항목은 빠져도 된다(기본값 [])

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
