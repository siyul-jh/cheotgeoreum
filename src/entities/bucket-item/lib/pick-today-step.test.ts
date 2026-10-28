import { describe, expect, it } from 'vitest'
import type { BucketItem } from '../model/schema'
import { pickTodayStep } from './pick-today-step'

let n = 0
const make = (patch: Partial<BucketItem> & { next?: string; due?: string | null }): BucketItem => {
  const { next = '할 일', due = null, ...rest } = patch
  n += 1
  return {
    id: `id${n}`,
    createdAt: `2026-10-${String(10 + n).padStart(2, '0')}T00:00:00.000Z`,
    title: `꿈${n}`,
    why: '',
    category: null,
    targetPeriod: null,
    prerequisites: [],
    nextAction: { text: next, dueDate: due },
    status: '진행 중',
    companions: [],
    ...rest,
  }
}

describe('pickTodayStep', () => {
  it('다음 행동이 있는 항목이 없으면 null', () => {
    expect(pickTodayStep([])).toBeNull()
    expect(pickTodayStep([make({ next: '' }), make({ next: '   ' })])).toBeNull()
  })
  it('완료·포기 항목은 고르지 않는다', () => {
    const items = [make({ status: '완료', due: '2026-01-01' }), make({ status: '포기', due: '2026-01-01' }), make({ status: '보류' })]
    expect(pickTodayStep(items)?.id).toBe(items[2]!.id)
  })
  it('기한이 빠른 순, 기한 없는 항목은 뒤', () => {
    const items = [make({ due: null }), make({ due: '2026-12-01' }), make({ due: '2026-11-03' })]
    expect(pickTodayStep(items)?.id).toBe(items[2]!.id)
  })
  it('기한이 같으면(없음 포함) 먼저 만든 항목', () => {
    const older = make({ due: '2026-11-03', createdAt: '2026-01-01T09:00:00+09:00' })
    const newer = make({ due: '2026-11-03', createdAt: '2026-01-01T01:00:00.000Z' })
    expect(pickTodayStep([newer, older])?.id).toBe(older.id)
    const a = make({ createdAt: '2026-03-01T00:00:00.000Z' })
    const b = make({ createdAt: '2026-02-01T00:00:00.000Z' })
    expect(pickTodayStep([a, b])?.id).toBe(b.id)
  })
})
