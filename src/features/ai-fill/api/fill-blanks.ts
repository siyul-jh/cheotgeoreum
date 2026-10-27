import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { BlankFieldSchema, BucketItemInputSchema, fieldLimits } from '@/entities/bucket-item'

export const FillBlanksInputSchema = z.object({
  item: BucketItemInputSchema.omit({ status: true, companions: true }),
  blankFields: z
    .array(BlankFieldSchema)
    .min(1)
    .max(BlankFieldSchema.options.length)
    .refine((fields) => new Set(fields).size === fields.length, '중복된 칸'),
  categories: z.array(z.string().max(fieldLimits.category)).min(1).max(100), // 서버 함수 입력 크기 상한
})
export type FillBlanksInput = z.infer<typeof FillBlanksInputSchema>

// 서버 전용 모듈은 handler 안에서만 동적 import한다(Spike 8: client 번들에서 제거됨)
export const fillBlanks = createServerFn({ method: 'POST' })
  .validator(FillBlanksInputSchema)
  .handler(async ({ data }) => {
    const [{ runFillBlanks }, { getModel }] = await Promise.all([
      import('./fill-blanks.server'),
      import('@/shared/api/llm.server'),
    ])
    return runFillBlanks(data, getModel())
  })
