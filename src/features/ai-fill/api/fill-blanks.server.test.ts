// @vitest-environment node
import { MockLanguageModelV4 } from 'ai/test'
import { DateTime } from 'luxon'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiDraft } from '@/entities/bucket-item'
import type { FillBlanksInput } from './fill-blanks'
import { runFillBlanks, sanitizeDraft } from './fill-blanks.server'

const TODAY = '2026-10-27'
const full: AiDraft = {
  why: '이유',
  category: '여행',
  targetPeriod: '2027-05',
  prerequisites: ['여권'],
  nextAction: { text: '항공권 검색', dueDate: '2026-11-01' },
}
const ctx = { blankFields: ['why', 'category', 'targetPeriod', 'prerequisites', 'nextActionText', 'nextActionDueDate'] as const, categories: ['여행', '건강'], today: TODAY }
const sanitize = (raw: Partial<AiDraft>, overrides: Partial<Parameters<typeof sanitizeDraft>[1]> = {}) =>
  sanitizeDraft({ ...full, ...raw }, { ...ctx, blankFields: [...ctx.blankFields], ...overrides })

describe('sanitizeDraft', () => {
  it('모든 칸이 유효하면 그대로', () => {
    expect(sanitize({})).toEqual(full)
  })
  it('blankFields에 없는 칸은 null', () => {
    expect(sanitize({}, { blankFields: ['nextActionDueDate'] })).toEqual({
      why: null,
      category: null,
      targetPeriod: null,
      prerequisites: null,
      nextAction: { text: null, dueDate: '2026-11-01' },
    })
  })
  it('nextAction 두 칸이 모두 비면 null', () => {
    expect(sanitize({}, { blankFields: ['why'] }).nextAction).toBeNull()
  })
  it('목록에 없는 category는 null', () => {
    expect(sanitize({ category: '우주' }).category).toBeNull()
  })
  it.each(['2027-13', '2099', '2025', '내년'])('targetPeriod %s는 null', (targetPeriod) => {
    expect(sanitize({ targetPeriod }).targetPeriod).toBeNull()
  })
  it.each(['2026', '2056-12'])('targetPeriod %s는 유지', (targetPeriod) => {
    expect(sanitize({ targetPeriod }).targetPeriod).toBe(targetPeriod)
  })
  it.each(['2026-10-26', '2026-02-30', '11월 1일'])('dueDate %s는 null', (dueDate) => {
    expect(sanitize({ nextAction: { text: '할 일', dueDate } }).nextAction).toEqual({ text: '할 일', dueDate: null })
  })
  it('오늘 날짜 dueDate는 유지', () => {
    expect(sanitize({ nextAction: { text: null, dueDate: TODAY } }).nextAction).toEqual({ text: null, dueDate: TODAY })
  })
  it('prerequisites는 trim, 빈 값 제거, 최대 5개, 길이 제한', () => {
    const long = 'a'.repeat(250)
    expect(sanitize({ prerequisites: [' 여권 ', '', '  ', '1', '2', '3', long, '5'] }).prerequisites).toEqual([
      '여권',
      '1',
      '2',
      '3',
      'a'.repeat(200),
    ])
    expect(sanitize({ prerequisites: [' '] }).prerequisites).toBeNull()
  })
  it('문자열은 fieldLimits에 맞춰 자르고 빈 문자열은 null', () => {
    const draft = sanitize({ why: 'a'.repeat(1200), nextAction: { text: '  ', dueDate: null } })
    expect(draft.why).toHaveLength(1000)
    expect(draft.nextAction).toBeNull()
  })
})

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
const input: FillBlanksInput = {
  item: {
    title: '오로라 보기',
    why: '',
    category: null,
    targetPeriod: null,
    prerequisites: [],
    nextAction: { text: '', dueDate: null },
  },
  blankFields: ['why', 'category'],
  categories: ['여행', '건강'],
}

describe('runFillBlanks', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('정상 응답이면 sanitize한 초안', async () => {
    vi.useFakeTimers({ now: DateTime.fromISO(`${TODAY}T12:00:00`).toMillis(), toFake: ['Date'] })
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [{ type: 'text', text: JSON.stringify({ ...full, category: '여행' }) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage,
        warnings: [],
      }),
    })
    const result = await runFillBlanks(input, model)
    expect(result).toEqual({
      ok: true,
      data: { why: '이유', category: '여행', targetPeriod: null, prerequisites: null, nextAction: null },
    })
    const prompt = JSON.stringify(model.doGenerateCalls[0].prompt)
    expect(prompt).toContain(TODAY)
    expect(prompt).toContain('오로라 보기')
    expect(prompt).toContain('건강')
  })

  it('오류면 code를 그대로 반환', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new TypeError('fetch failed')
      },
    })
    expect(await runFillBlanks(input, model)).toEqual({ ok: false, code: 'llm_unreachable' })
  })
})
