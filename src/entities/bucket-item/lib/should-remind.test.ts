import { describe, expect, it } from 'vitest'
import type { TargetPeriod } from '../model/schema'
import { halvings, shouldRemind } from './should-remind'

// 한 해 동안 알림 날만 모은다
const daysIn = (period: TargetPeriod | null, from: string, to: string) => {
  const out: string[] = []
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    if (shouldRemind(period, iso)) out.push(iso)
  }
  return out
}

describe('shouldRemind', () => {
  it('목표 시기가 없으면 보내지 않는다', () => {
    expect(daysIn(null, '2027-01-01', '2027-12-31')).toEqual([])
  })

  it('이때쯤 연-월: 그 달 1일의 7·3·1일 전과 당일', () => {
    expect(daysIn({ kind: 'start', at: '2027-03' }, '2027-01-01', '2027-12-31')).toEqual(['2027-02-22', '2027-02-26', '2027-02-28', '2027-03-01'])
  })

  it('이때까지 연-월: 그 달 말일의 7·3·1일 전과 당일', () => {
    expect(daysIn({ kind: 'end', at: '2027-02' }, '2027-01-01', '2027-12-31')).toEqual(['2027-02-21', '2027-02-25', '2027-02-27', '2027-02-28'])
  })

  it('이때쯤 연도만: 그 해 매달 1일', () => {
    const days = daysIn({ kind: 'start', at: '2027' }, '2026-01-01', '2028-12-31')
    expect(days).toHaveLength(12)
    expect([days[0], days[11]]).toEqual(['2027-01-01', '2027-12-01'])
  })

  it('이때까지 연도만: 그 해 말까지 매달 말일', () => {
    const days = daysIn({ kind: 'end', at: '2027' }, '2026-11-01', '2028-12-31')
    expect(days[0]).toBe('2026-11-30')
    expect(days.at(-1)).toBe('2027-12-31')
    expect(days).toHaveLength(14)
  })

  it('기간(둘 다 연-월): 시작 카운트다운 + 남은 기간 절반마다 + 끝 카운트다운', () => {
    // 2027-01-01 ~ 2027-04-30 = 119일 → 59·29·14일 남았을 때
    expect(daysIn({ kind: 'range', from: '2027-01', to: '2027-04' }, '2026-12-01', '2027-05-31')).toEqual([
      '2026-12-25', '2026-12-29', '2026-12-31', '2027-01-01',
      '2027-03-02', '2027-04-01', '2027-04-16',
      '2027-04-23', '2027-04-27', '2027-04-29', '2027-04-30',
    ])
  })

  it('기간에 연도만 있는 쪽이 있거나 끝이 없으면 기간 안에서 매달 1일', () => {
    expect(daysIn({ kind: 'range', from: '2027-11', to: '2028' }, '2027-01-01', '2029-12-31')).toHaveLength(14)
    expect(daysIn({ kind: 'range', from: '2027', to: '2027-03' }, '2026-01-01', '2029-12-31')).toEqual(['2027-01-01', '2027-02-01', '2027-03-01'])
    expect(daysIn({ kind: 'range', from: '2027-10', to: null }, '2027-01-01', '2027-12-31')).toEqual(['2027-10-01', '2027-11-01', '2027-12-01'])
  })
})

describe('halvings', () => {
  it('100일이면 50·25·12일 남았을 때', () => {
    expect(halvings(100)).toEqual([50, 25, 12])
    expect(halvings(14)).toEqual([])
  })
})
