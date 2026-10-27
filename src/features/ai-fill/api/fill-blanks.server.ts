import type { LanguageModel } from 'ai'
import { DateTime } from 'luxon'
import {
  AiDraftSchema,
  fieldLimits,
  IsoDateSchema,
  TargetPeriodSchema,
  type AiDraft,
  type BlankField,
} from '@/entities/bucket-item'
import { generateStructured } from '@/shared/api/llm.server'
import type { LlmResult } from '@/shared/lib/llm-result'
import type { FillBlanksInput } from './fill-blanks'

const MAX_PREREQUISITES = 5
const TARGET_YEAR_RANGE = 30

const FIELD_GUIDES: Record<BlankField, string> = {
  why: 'why: 이 일을 하고 싶은 이유. 1~2문장',
  category: 'category: 카테고리 목록 중 하나를 그대로',
  targetPeriod: `targetPeriod: 목표 시기. "YYYY" 또는 "YYYY-MM", 올해부터 ${TARGET_YEAR_RANGE}년 안`,
  prerequisites: `prerequisites: 먼저 갖추거나 준비할 것. 짧은 문장 ${MAX_PREREQUISITES}개 이하`,
  nextActionText: 'nextAction.text: 이번 주 안에 할 수 있는 구체적인 첫 행동 한 줄',
  nextActionDueDate: 'nextAction.dueDate: 첫 행동 기한. "YYYY-MM-DD", 오늘 이후',
}

const SYSTEM = [
  '당신은 버킷리스트 작성을 돕는 도우미다.',
  '요청한 칸만 채우고 나머지 키는 null로 둔다. nextAction은 text와 dueDate 중 요청한 쪽만 채운다.',
  '자연스러운 한국어로 짧게 쓴다.',
].join('\n')

const toText = (value: string | null, max: number) => {
  const text = value?.trim().slice(0, max)
  return text ? text : null
}

export function sanitizeDraft(
  raw: AiDraft,
  ctx: { blankFields: BlankField[]; categories: string[]; today: string },
): AiDraft {
  const { blankFields, categories, today } = ctx
  const wants = (field: BlankField) => blankFields.includes(field)
  const thisYear = Number(today.slice(0, 4))

  const category = raw.category?.trim() ?? null
  const targetPeriod = raw.targetPeriod?.trim() ?? ''
  const targetYear = Number(targetPeriod.slice(0, 4))
  const prerequisites = (raw.prerequisites ?? [])
    .map((text) => toText(text, fieldLimits.prerequisite))
    .filter((text) => text !== null)
    .slice(0, MAX_PREREQUISITES)
  const dueDate = raw.nextAction?.dueDate?.trim() ?? ''
  const nextAction = {
    text: wants('nextActionText') ? toText(raw.nextAction?.text ?? null, fieldLimits.nextActionText) : null,
    dueDate: wants('nextActionDueDate') && IsoDateSchema.safeParse(dueDate).success && dueDate >= today ? dueDate : null,
  }

  return {
    why: wants('why') ? toText(raw.why, fieldLimits.why) : null,
    category: wants('category') && category !== null && categories.includes(category) ? category : null,
    targetPeriod:
      wants('targetPeriod') &&
      TargetPeriodSchema.safeParse(targetPeriod).success &&
      targetYear >= thisYear &&
      targetYear <= thisYear + TARGET_YEAR_RANGE
        ? targetPeriod
        : null,
    prerequisites: wants('prerequisites') && prerequisites.length > 0 ? prerequisites : null,
    nextAction: nextAction.text === null && nextAction.dueDate === null ? null : nextAction,
  }
}

export async function runFillBlanks(input: FillBlanksInput, model: LanguageModel): Promise<LlmResult<AiDraft>> {
  const { item, blankFields, categories } = input
  const today = DateTime.now().toISODate()
  const { nextAction, ...rest } = item
  const blank = new Set<string>(blankFields)
  // 맥락: 빈 칸을 뺀 나머지 값
  const context = Object.fromEntries(
    Object.entries({ ...rest, nextActionText: nextAction.text, nextActionDueDate: nextAction.dueDate }).filter(
      ([key]) => !blank.has(key),
    ),
  )
  const prompt = [
    `오늘: ${today}`,
    `항목: ${JSON.stringify(context)}`,
    `카테고리 목록(이 목록에서만 고른다): ${JSON.stringify(categories)}`,
    '채울 칸:',
    ...blankFields.map((field) => `- ${FIELD_GUIDES[field]}`),
  ].join('\n')

  const result = await generateStructured({ model, schema: AiDraftSchema, system: SYSTEM, prompt, temperature: 0.7 })
  return result.ok ? { ok: true, data: sanitizeDraft(result.data, { blankFields, categories, today }) } : result
}
