import { z } from 'zod'

export const STATUSES = ['아이디어', '계획', '진행 중', '완료', '보류', '포기'] as const
export type Status = (typeof STATUSES)[number]
export const DEFAULT_CATEGORIES = ['여행', '건강', '배움', '관계', '커리어', '재정', '경험'] as const
export const UNCATEGORIZED_LABEL = '미분류' // category === null 표시
export const UNCATEGORIZED_FILTER = '__none__' // 목록 search param 예약값
export const fieldLimits = {
  title: 100,
  why: 1000,
  category: 30,
  prerequisite: 200,
  nextActionText: 200,
  companion: 30,
  keyword: 50,
  prerequisiteCount: 30,
  companionCount: 30,
} as const

export const IsoDateSchema = z.iso.date()
export const PeriodPointSchema = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/) // YYYY 또는 YYYY-MM

// 연만 있으면 시작은 1월, 끝은 12월로 비교한다(2027-03 ~ 2027 허용)
const isPeriodOrdered = (from: string, to: string) =>
  (from.length === 4 ? `${from}-01` : from) <= (to.length === 4 ? `${to}-12` : to)

// start: 이때쯤 / end: 이때까지 / range: 기간
export const TargetPeriodSchema = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('start'), at: PeriodPointSchema }),
    z.object({ kind: z.literal('end'), at: PeriodPointSchema }),
    // 입력 중 한쪽만 고른 상태를 폼 값으로 담으려고 nullable. 저장·단계 확정은 아래 refine이 막는다
    z.object({ kind: z.literal('range'), from: PeriodPointSchema.nullable(), to: PeriodPointSchema.nullable() }),
  ])
  .refine((p) => p.kind !== 'range' || (p.from !== null && p.to !== null), '시작과 끝을 모두 골라 주세요')
  .refine(
    (p) => p.kind !== 'range' || p.from === null || p.to === null || isPeriodOrdered(p.from, p.to),
    '끝이 시작보다 빨라요',
  )
export type TargetPeriod = z.infer<typeof TargetPeriodSchema>
export type PeriodKind = TargetPeriod['kind']

// 빈 값 규칙: 자유 텍스트 '' / 선택·형식 값 null
export const BucketItemInputSchema = z.object({
  title: z.string().trim().min(1).max(fieldLimits.title),
  why: z.string().trim().max(fieldLimits.why),
  category: z.string().trim().min(1).max(fieldLimits.category).nullable(),
  targetPeriod: TargetPeriodSchema.nullable(),
  prerequisites: z
    .array(z.object({ text: z.string().trim().min(1).max(fieldLimits.prerequisite), done: z.boolean() }))
    .max(fieldLimits.prerequisiteCount),
  nextAction: z.object({
    text: z.string().trim().max(fieldLimits.nextActionText),
    dueDate: IsoDateSchema.nullable(),
  }),
  status: z.enum(STATUSES),
  companions: z.array(z.string().trim().min(1).max(fieldLimits.companion)).max(fieldLimits.companionCount),
})
export type BucketItemInput = z.infer<typeof BucketItemInputSchema>

export const BucketItemSchema = BucketItemInputSchema.extend({
  id: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
})
export type BucketItem = z.infer<typeof BucketItemSchema>

export type ItemValues = Omit<BucketItemInput, 'status'>
export type ItemField = keyof ItemValues
export const AI_FIELDS = ['why', 'category', 'targetPeriod', 'prerequisites', 'nextAction'] as const satisfies readonly ItemField[]
export type AiField = (typeof AI_FIELDS)[number]

// LLM 출력 스키마: 모든 키 required + nullable, 제약 없음(strict json_schema 호환)
export const AiDraftSchema = z.object({
  why: z.string().nullable(),
  category: z.string().nullable(),
  targetPeriod: z.string().nullable(),
  prerequisites: z.array(z.string()).nullable(),
  nextAction: z.object({ text: z.string().nullable(), dueDate: z.string().nullable() }).nullable(),
})
export type AiDraft = z.infer<typeof AiDraftSchema>
