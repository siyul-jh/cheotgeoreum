import { describe, expect, it } from 'vitest'
import { FillBlanksInputSchema, type FillBlanksInput } from './fill-blanks'

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
  categories: ['여행'],
}
const ok = (over: Partial<FillBlanksInput>) => FillBlanksInputSchema.safeParse({ ...input, ...over }).success

describe('FillBlanksInputSchema', () => {
  it('blankFields 중복은 거부', () => {
    expect(ok({ blankFields: ['why', 'why'] })).toBe(false)
  })
  it('blankFields는 BlankField 개수까지', () => {
    expect(ok({ blankFields: ['why', 'category', 'targetPeriod', 'prerequisites', 'nextActionText', 'nextActionDueDate'] })).toBe(true)
    expect(ok({ blankFields: Array.from({ length: 7 }, () => 'why' as const) })).toBe(false)
  })
  it('categories는 100개까지', () => {
    const names = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`)
    expect(ok({ categories: names(100) })).toBe(true)
    expect(ok({ categories: names(101) })).toBe(false)
  })
})
