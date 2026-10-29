import { describe, expect, it } from 'vitest'
import { formatFieldValue } from './format-field'

describe('formatFieldValue', () => {
  it.each([
    [{ kind: 'start', at: '2027-02' }, '2027년 2월쯤'],
    [{ kind: 'start', at: '2027' }, '2027년쯤'],
    [{ kind: 'end', at: '2027-02' }, '2027년 2월까지'],
    [{ kind: 'end', at: '2027' }, '2027년까지'],
    [{ kind: 'range', from: '2027-02', to: '2027-08' }, '2027년 2월 ~ 2027년 8월'],
    [{ kind: 'range', from: '2027', to: '2028' }, '2027년 ~ 2028년'],
  ] as const)('targetPeriod %o → %s', (targetPeriod, text) => {
    expect(formatFieldValue('targetPeriod', { targetPeriod })).toBe(text)
  })
  it('nextAction 기한은 날짜 표기', () => {
    expect(formatFieldValue('nextAction', { nextAction: { text: '검색', dueDate: '2026-11-03' } })).toBe('검색 · 11월 3일 (화)')
  })
  it('빈 값은 건너뜀', () => {
    expect(formatFieldValue('why', { why: '' })).toBe('건너뜀')
    expect(formatFieldValue('category', { category: null })).toBe('건너뜀')
    expect(formatFieldValue('targetPeriod', { targetPeriod: null })).toBe('건너뜀')
    expect(formatFieldValue('prerequisites', { prerequisites: [] })).toBe('건너뜀')
    expect(formatFieldValue('nextAction', { nextAction: { text: '', dueDate: null } })).toBe('건너뜀')
    expect(formatFieldValue('companions', {})).toBe('건너뜀')
  })
})
