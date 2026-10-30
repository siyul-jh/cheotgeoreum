import { expect, test } from 'vitest'
import type { ItemValues } from '@/entities/bucket-item'
import { buildCardModel } from './card-model'

const base: ItemValues = {
  title: '오로라 보기',
  why: '',
  category: null,
  targetPeriod: null,
  prerequisites: [],
  nextAction: { text: '', dueDate: null },
  companions: [],
}

test('제목만 있으면 나머지 칸은 비운다', () => {
  expect(buildCardModel(base)).toEqual({ title: '오로라 보기', period: null, category: null, why: '', details: [] })
})

test('모든 칸을 표시 문구로 바꾼다', () => {
  expect(
    buildCardModel({
      ...base,
      targetPeriod: { kind: 'end', at: '2027-03' },
      why: '하늘이 보고 싶어서',
      category: '여행',
      prerequisites: [{ text: '여권', done: false }, { text: '적금', done: true }],
      nextAction: { text: '항공권 검색', dueDate: '2026-11-03' },
      companions: ['민지'],
    }),
  ).toEqual({
    title: '오로라 보기',
    period: '2027년 3월까지',
    category: '여행',
    why: '하늘이 보고 싶어서',
    details: [
      { label: '선행 과제', value: '여권, 적금' },
      { label: '다음 행동', value: '항공권 검색 · 11월 3일 (화)' },
      { label: '함께할 사람', value: '민지' },
    ],
  })
})

test('세부 칸은 값 있는 것만 선행 과제 → 다음 행동 → 함께할 사람 순서로', () => {
  const card = buildCardModel({ ...base, companions: ['민지'], nextAction: { text: '', dueDate: '2026-11-03' } })
  expect(card.details.map((d) => d.label)).toEqual(['다음 행동', '함께할 사람'])
})
