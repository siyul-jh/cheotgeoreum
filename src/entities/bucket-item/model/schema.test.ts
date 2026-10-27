import { describe, expect, it } from 'vitest'
import { BucketItemInputSchema, TargetPeriodSchema } from './schema'

const base = {
  title: 'a',
  why: '',
  category: null,
  targetPeriod: null,
  prerequisites: [],
  nextAction: { text: '', dueDate: null },
  status: '아이디어',
  companions: [],
}

describe('schema', () => {
  it.each(['2027', '2027-05'])('targetPeriod %s 통과', (v) => {
    expect(TargetPeriodSchema.safeParse(v).success).toBe(true)
  })
  it.each(['2027-13', '27', '2027-5'])('targetPeriod %s 실패', (v) => {
    expect(TargetPeriodSchema.safeParse(v).success).toBe(false)
  })
  it('존재하지 않는 dueDate 실패', () => {
    const r = BucketItemInputSchema.safeParse({ ...base, nextAction: { text: '', dueDate: '2026-02-30' } })
    expect(r.success).toBe(false)
  })
  it('title 공백만이면 실패, trim 반영', () => {
    expect(BucketItemInputSchema.safeParse({ ...base, title: '  ' }).success).toBe(false)
    expect(BucketItemInputSchema.parse({ ...base, title: ' a ' }).title).toBe('a')
  })
})
