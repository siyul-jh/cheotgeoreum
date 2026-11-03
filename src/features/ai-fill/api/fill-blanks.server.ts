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
    'start는 from만, end는 to만, range는 from을 채우고 끝을 정할 수 있으면 to도 채우되 from이 to보다 늦지 않게(끝을 모르면 to는 null). 쓰지 않는 칸은 null',
    `시점은 "YYYY" 또는 "YYYY-MM", 올해부터 ${TARGET_YEAR_RANGE}년 안`,
    '먼 언젠가보다 올해·이번 분기처럼 가까운 때를 먼저 고르고, 오래 걸리는 큰 꿈만 몇 년 뒤로',
  ].join('. '),
  prerequisites: `prerequisites: 꿈을 이루기까지의 작은 단계. 각 단계는 1~2주 안에 끝낼 수 있게 잘게 쪼개 순서대로, 짧은 문장 ${MAX_PREREQUISITES}개 이하`,
  nextActionText: 'nextAction.text: 오늘이나 이번 주에 10~30분이면 끝나는 아주 작은 첫 행동 한 줄. 반복할 일이면 일상 속 때(아침 커피 마시며, 잠들기 전 등)를 붙인다',
  nextActionDueDate: 'nextAction.dueDate: 첫 행동 기한. "YYYY-MM-DD", 오늘 이후',
}

const SYSTEM = [
  '당신은 버킷리스트 작성을 돕는 도우미다.',
  '요청한 칸만 채우고 나머지 키는 null로 둔다. nextAction은 text와 dueDate 중 요청한 쪽만 채운다.',
  '자연스러운 한국어로 짧게 쓴다.',
  '[작게] 큰 꿈도 부담 없이 시작할 수 있게 작은 단계로 나눈다. [루틴] 반복이 필요한 일은 하루 일과 속 정해진 때에 붙여 쓴다. [가깝게] 죽기 전 언젠가가 아니라 올해·이번 달에 할 수 있게 한다.',
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
  // 기간의 끝은 비어 있을 수 있다(…부터)
  const points = period.kind === 'range' ? [period.from, period.to ?? period.from] : [period.at]
  return points.every(inRange) ? period : null
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
