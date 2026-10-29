import type { LanguageModel } from 'ai'
import { DateTime } from 'luxon'
import {
  AiDraftSchema,
  fieldLimits,
  IsoDateSchema,
  TargetPeriodSchema,
  type AiDraft,
  type AiRawDraft,
  type BlankField,
  type TargetPeriod,
} from '@/entities/bucket-item'
import { generateStructured } from '@/shared/api/llm.server'
import type { LlmResult } from '@/shared/lib/llm-result'
import type { FillBlanksInput } from './fill-blanks'

const MAX_PREREQUISITES = 5
const TARGET_YEAR_RANGE = 30

const FIELD_GUIDES: Record<BlankField, string> = {
  why: 'why: 이 일을 하고 싶은 이유. 1~2문장',
  category: 'category: 카테고리 목록 중 하나를 그대로',
  targetPeriod: [
    'targetPeriod: 목표 시기. kind는 "start"(이때쯤) · "end"(이때까지) · "range"(기간: 시작~끝) 중 하나',
    'start는 from만, end는 to만, range는 from과 to를 모두 채우고 from이 to보다 늦지 않게. 쓰지 않는 칸은 null',
    `시점은 "YYYY" 또는 "YYYY-MM", 올해부터 ${TARGET_YEAR_RANGE}년 안`,
  ].join('. '),
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

// 형식·종류·순서는 TargetPeriodSchema가, 범위(올해부터 TARGET_YEAR_RANGE년, YYYY-MM은 이번 달부터)는 시점마다 본다
function toTargetPeriod(raw: AiRawDraft['targetPeriod'], today: string): TargetPeriod | null {
  if (!raw) return null
  const from = raw.from?.trim() ?? null
  const to = raw.to?.trim() ?? null
  const parsed = TargetPeriodSchema.safeParse(
    raw.kind === 'start' ? { kind: 'start', at: from } : raw.kind === 'end' ? { kind: 'end', at: to } : { kind: raw.kind, from, to },
  )
  if (!parsed.success) return null
  const thisYear = Number(today.slice(0, 4))
  const inRange = (point: string | null) => {
    const year = Number(point?.slice(0, 4))
    return point !== null && year >= thisYear && year <= thisYear + TARGET_YEAR_RANGE && (point.length === 4 || point >= today.slice(0, 7))
  }
  const period = parsed.data
  return (period.kind === 'range' ? [period.from, period.to] : [period.at]).every(inRange) ? period : null
}

export function sanitizeDraft(
  raw: AiRawDraft,
  ctx: { blankFields: BlankField[]; categories: string[]; today: string },
): AiDraft {
  const { blankFields, categories, today } = ctx
  const wants = (field: BlankField) => blankFields.includes(field)

  const category = raw.category?.trim() ?? null
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
    targetPeriod: wants('targetPeriod') ? toTargetPeriod(raw.targetPeriod, today) : null,
    prerequisites: wants('prerequisites') && prerequisites.length > 0 ? prerequisites : null,
    nextAction: nextAction.text === null && nextAction.dueDate === null ? null : nextAction,
  }
}

export async function runFillBlanks(input: FillBlanksInput, model: LanguageModel): Promise<LlmResult<AiDraft>> {
  const { item, blankFields, categories } = input
  const today = DateTime.now().toISODate()
  const { nextAction, ...rest } = item
  const blank = new Set<string>(blankFields)
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
