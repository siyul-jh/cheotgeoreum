// @vitest-environment node
import { MockLanguageModelV4 } from 'ai/test'
import { DateTime } from 'luxon'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiRawDraft } from '@/entities/bucket-item'
import type { FillBlanksInput } from './fill-blanks'
import { runFillBlanks, sanitizeDraft } from './fill-blanks.server'

const TODAY = '2026-10-27'
const full: AiRawDraft = {
  why: '이유',
  category: '여행',
  targetPeriod: { kind: 'start', from: '2027-05', to: null },
  prerequisites: ['여권'],
  nextAction: { text: '항공권 검색', dueDate: '2026-11-01' },
}
const ctx = { blankFields: ['why', 'category', 'targetPeriod', 'prerequisites', 'nextActionText', 'nextActionDueDate'] as const, categories: ['여행', '건강'], today: TODAY }
const sanitize = (raw: Partial<AiRawDraft>, overrides: Partial<Parameters<typeof sanitizeDraft>[1]> = {}) =>
  sanitizeDraft({ ...full, ...raw }, { ...ctx, blankFields: [...ctx.blankFields], ...overrides })

describe('sanitizeDraft', () => {
  it('모든 칸이 유효하면 그대로(목표 시기는 도메인 형태로)', () => {
    expect(sanitize({})).toEqual({ ...full, targetPeriod: { kind: 'start', at: '2027-05' } })
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
  it.each([
    [{ kind: 'start', from: '2026', to: null }, { kind: 'start', at: '2026' }],
    [{ kind: 'start', from: ' 2026-10 ', to: null }, { kind: 'start', at: '2026-10' }], // 이번 달은 유지
    [{ kind: 'end', from: null, to: '2056-12' }, { kind: 'end', at: '2056-12' }],
    [{ kind: 'range', from: '2027-03', to: '2027' }, { kind: 'range', from: '2027-03', to: '2027' }],
  ])('targetPeriod %o는 %o', (targetPeriod, expected) => {
    expect(sanitize({ targetPeriod }).targetPeriod).toEqual(expected)
  })
  // AC-T4: 목표 시기만 null, 나머지 칸은 산다
  it.each([
    ['모르는 종류', { kind: 'around', from: '2027', to: null }],
    ['종류 없음', { kind: null, from: '2027', to: null }],
    ['start인데 from 없음', { kind: 'start', from: null, to: '2027' }],
    ['end인데 to 없음', { kind: 'end', from: '2027', to: null }],
    ['형식 오류', { kind: 'start', from: '2027-13', to: null }],
    ['말로 쓴 시점', { kind: 'end', from: null, to: '내년' }],
    ['30년 넘음', { kind: 'start', from: '2099', to: null }],
    ['지난 해', { kind: 'end', from: null, to: '2025' }],
    ['올해 지난 달', { kind: 'start', from: '2026-09', to: null }],
    ['기간 끝 없음', { kind: 'range', from: '2027', to: null }],
    ['기간 역순', { kind: 'range', from: '2028', to: '2027-05' }],
    ['기간 시작이 지난 달', { kind: 'range', from: '2026-09', to: '2027' }],
    ['기간 끝이 30년 넘음', { kind: 'range', from: '2027', to: '2099' }],
  ])('targetPeriod %s면 그 칸만 null', (_label, targetPeriod) => {
    const r = sanitize({ targetPeriod })
    expect(r.targetPeriod).toBeNull()
    expect(r).toMatchObject({ why: '이유', category: '여행', prerequisites: ['여권'] })
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

  it('목표 시기를 채울 때 종류와 시점을 함께 묻고, 출력 스키마는 모든 키가 required', async () => {
    vi.useFakeTimers({ now: DateTime.fromISO(`${TODAY}T12:00:00`).toMillis(), toFake: ['Date'] })
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [{ type: 'text', text: JSON.stringify({ ...full, targetPeriod: { kind: 'range', from: '2027', to: '2028' } }) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage,
        warnings: [],
      }),
    })
    const result = await runFillBlanks({ ...input, blankFields: ['targetPeriod'] }, model)
    expect(result).toEqual({
      ok: true,
      data: { why: null, category: null, targetPeriod: { kind: 'range', from: '2027', to: '2028' }, prerequisites: null, nextAction: null },
    })
    const call = model.doGenerateCalls[0]
    const prompt = JSON.stringify(call.prompt)
    for (const word of ['start', 'end', 'range', '이때쯤', '이때까지', '기간']) expect(prompt).toContain(word)
    const format = call.responseFormat
    const schema = format?.type === 'json' ? (format.schema as { properties: Record<string, { anyOf?: { required?: string[] }[] }> }) : null
    expect(schema?.properties.targetPeriod.anyOf?.[0]?.required).toEqual(['kind', 'from', 'to'])
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
