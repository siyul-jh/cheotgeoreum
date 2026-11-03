import { describe, expect, it } from 'vitest'
import type { ItemValues } from '../model/schema'
import { getBlankFields } from './get-blank-fields'

const empty: ItemValues = {
  title: 't',
  why: '',
  category: null,
  targetPeriod: null,
  prerequisites: [],
  nextAction: { text: '', dueDate: null },
  companions: [],
}

describe('getBlankFields', () => {
  it('모두 비면 5개(첫 행동 날짜는 묻지 않는다)', () => {
    expect(getBlankFields(empty)).toEqual(['why', 'category', 'targetPeriod', 'prerequisites', 'nextActionText'])
  })
  it('category가 있으면 제외', () => {
    expect(getBlankFields({ ...empty, category: '여행' })).not.toContain('category')
  })
  it('모두 채우면 없다(날짜가 비어도)', () => {
    const v: ItemValues = {
      ...empty, why: 'w', category: '여행', targetPeriod: { kind: 'start', at: '2027' },
      prerequisites: [{ text: 'a', done: false }], nextAction: { text: '예약', dueDate: null },
    }
    expect(getBlankFields(v)).toEqual([])
  })
  it('status와 companions는 포함하지 않는다', () => {
    const result: string[] = getBlankFields(empty)
    expect(result).not.toContain('status')
    expect(result).not.toContain('companions')
  })
})
