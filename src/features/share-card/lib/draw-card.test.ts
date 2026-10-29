import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { BucketItemInput } from '@/entities/bucket-item'
import { drawCard } from './draw-card'

// jsdom에는 canvas가 없어 fillText만 기록하는 가짜 컨텍스트로 그린다. 글자 하나 = 40px
function fakeContext() {
  const texts: string[] = []
  const state: Record<string | symbol, unknown> = {}
  const ctx: object = new Proxy(state, {
    get: (target, key) => {
      if (key === 'fillText') return (s: string) => texts.push(s)
      if (key === 'measureText') return (s: string) => ({ width: Array.from(s).length * 40 })
      if (key in target) return target[key]
      return () => ctx
    },
    set: (target, key, value) => {
      target[key] = value
      return true
    },
  })
  return { ctx: ctx as CanvasRenderingContext2D, texts }
}

const base: BucketItemInput = {
  title: '오로라 보기',
  why: '',
  category: null,
  targetPeriod: null,
  prerequisites: [],
  nextAction: { text: '', dueDate: null },
  status: '아이디어',
  companions: [],
}

beforeEach(() => vi.stubGlobal('Path2D', class {}))
afterEach(() => vi.unstubAllGlobals())

test('제목만 있으면 제목·상태와 하단 로고만 쓴다', () => {
  const { ctx, texts } = fakeContext()
  drawCard(ctx, base)
  expect(texts).toEqual(['오로라 보기', '아이디어', '첫걸음'])
})

test('모든 항목이 있으면 모두 쓴다', () => {
  const { ctx, texts } = fakeContext()
  drawCard(ctx, {
    ...base,
    targetPeriod: { kind: 'end', at: '2027-03' },
    why: '하늘이 보고 싶어서',
    category: '여행',
    prerequisites: [{ text: '여권', done: false }, { text: '적금', done: true }],
    nextAction: { text: '항공권 검색', dueDate: '2026-11-03' },
    companions: ['민지'],
  })
  expect(texts).toEqual([
    '오로라 보기',
    '2027년 3월까지',
    '여행',
    '아이디어',
    '하늘이 보고 싶어서',
    '선행 과제',
    '여권, 적금',
    '다음 행동',
    '항공권 검색 · 11월 3일 (화)',
    '함께할 사람',
    '민지',
    '첫걸음',
  ])
})

test.each([
  [{ kind: 'start', at: '2027-03' }, '2027년 3월쯤'],
  [{ kind: 'range', from: '2027', to: '2028' }, '2027년 ~ 2028년'],
] as const)('목표 시기는 종류대로 쓴다(까지를 덧붙이지 않는다) %o', (targetPeriod, text) => {
  const { ctx, texts } = fakeContext()
  drawCard(ctx, { ...base, targetPeriod })
  expect(texts).toEqual(['오로라 보기', text, '아이디어', '첫걸음'])
})

test('긴 제목과 왜는 3줄에서 말줄임한다', () => {
  const { ctx, texts } = fakeContext()
  drawCard(ctx, { ...base, title: '가'.repeat(100), why: '나'.repeat(200) })
  const titleLines = texts.filter((t) => t.startsWith('가'))
  const whyLines = texts.filter((t) => t.startsWith('나'))
  expect(titleLines).toHaveLength(3)
  expect(whyLines).toHaveLength(3)
  expect(titleLines[2].endsWith('…')).toBe(true)
  expect(whyLines[2].endsWith('…')).toBe(true)
})
