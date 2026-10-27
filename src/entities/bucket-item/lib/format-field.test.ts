import { describe, expect, it } from 'vitest'
import { formatFieldValue } from './format-field'

describe('formatFieldValue', () => {
  it('targetPeriod 월 표기', () => {
    expect(formatFieldValue('targetPeriod', { targetPeriod: '2027-05' })).toBe('2027년 5월')
    expect(formatFieldValue('targetPeriod', { targetPeriod: '2027' })).toBe('2027년')
  })
  it('빈 값은 건너뜀', () => {
    expect(formatFieldValue('why', { why: '' })).toBe('건너뜀')
    expect(formatFieldValue('category', { category: null })).toBe('건너뜀')
    expect(formatFieldValue('prerequisites', { prerequisites: [] })).toBe('건너뜀')
    expect(formatFieldValue('nextAction', { nextAction: { text: '', dueDate: null } })).toBe('건너뜀')
    expect(formatFieldValue('companions', {})).toBe('건너뜀')
  })
})
