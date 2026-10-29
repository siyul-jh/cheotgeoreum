import { describe, expect, it } from 'vitest'
import { BucketItemInputSchema, PeriodPointSchema, TargetPeriodSchema } from './schema'

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
  it.each(['2027', '2027-05'])('시점 %s 통과', (v) => {
    expect(PeriodPointSchema.safeParse(v).success).toBe(true)
  })
  it.each(['2027-13', '27', '2027-5'])('시점 %s 실패', (v) => {
    expect(PeriodPointSchema.safeParse(v).success).toBe(false)
  })
  it.each([
    { kind: 'start', at: '2027-05' },
    { kind: 'end', at: '2027' },
    { kind: 'range', from: '2027-03', to: '2027' },
    { kind: 'range', from: '2027', to: '2027' },
  ])('targetPeriod %o 통과', (v) => {
    expect(TargetPeriodSchema.safeParse(v).success).toBe(true)
  })
  it.each([
    ['문자열(version 1 형식)', '2027'],
    ['시점 형식 오류', { kind: 'start', at: '2027-5' }],
    ['모르는 종류', { kind: 'around', at: '2027' }],
  ])('targetPeriod %s 실패', (_label, v) => {
    expect(TargetPeriodSchema.safeParse(v).success).toBe(false)
  })
  it.each([
    ['끝 없음', { kind: 'range', from: '2027', to: null }, '시작과 끝을 모두 골라 주세요'],
    ['시작 없음', { kind: 'range', from: null, to: '2027' }, '시작과 끝을 모두 골라 주세요'],
    ['역순', { kind: 'range', from: '2028', to: '2027-05' }, '끝이 시작보다 빨라요'],
    ['같은 해 역순 월', { kind: 'range', from: '2027-08', to: '2027-02' }, '끝이 시작보다 빨라요'],
  ])('range %s는 이유와 함께 실패', (_label, v, message) => {
    const r = TargetPeriodSchema.safeParse(v)
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.message)).toEqual([message])
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
