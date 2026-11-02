import { describe, expect, test } from 'vitest'
import type { BucketItem, Tombstone } from '../model/schema'
import { mergeCategories, mergeItems } from './merge-items'

const t = (h: number) => `2026-11-01T${String(h).padStart(2, '0')}:00:00.000Z`
const item = (id: string, h: number, title = `${id}@${h}`): BucketItem => ({
  id, title, why: '', category: null, targetPeriod: null, prerequisites: [], nextAction: { text: '', dueDate: null },
  status: '아이디어', companions: [], createdAt: t(0), updatedAt: t(h),
})
const tomb = (id: string, h: number): Tombstone => ({ id, deletedAt: t(h) })
const titles = (r: { items: BucketItem[] }) => r.items.map((i) => i.title)
const none = { items: [], deleted: [] }

// 계획의 시나리오 표: 서버 → 들어옴(이 기기)
describe('mergeItems', () => {
  test('서버 편집 t1 ← 이 기기 삭제 t2: 삭제', () => {
    expect(mergeItems({ items: [], deleted: [tomb('a', 2)] }, { items: [item('a', 1)], deleted: [] }).items).toEqual([])
  })
  test('서버 삭제 t2 ← 이 기기 편집 t1: 삭제 유지', () => {
    expect(mergeItems({ items: [item('a', 1)], deleted: [] }, { items: [], deleted: [tomb('a', 2)] }).items).toEqual([])
  })
  test('서버 삭제 t2 ← 이 기기 편집 t3: 되살아남', () => {
    expect(titles(mergeItems({ items: [item('a', 3)], deleted: [] }, { items: [], deleted: [tomb('a', 2)] }))).toEqual(['a@3'])
  })
  test('같은 시각이면 서버 값 유지(편집 t1 ← 삭제 t1, 편집 t1 ← 편집 t1)', () => {
    expect(titles(mergeItems({ items: [], deleted: [tomb('a', 1)] }, { items: [item('a', 1)], deleted: [] }))).toEqual(['a@1'])
    expect(titles(mergeItems({ items: [item('a', 1, '이 기기')], deleted: [] }, { items: [item('a', 1, '서버')], deleted: [] }))).toEqual(['서버'])
  })
  test('더 새 쪽 편집이 이기고, 한쪽에만 있는 꿈은 남는다(이 기기 순서 → 새 꿈)', () => {
    const local = { items: [item('b', 3), item('a', 1)], deleted: [] }
    const server = { items: [item('a', 2), item('c', 1)], deleted: [] }
    expect(titles(mergeItems(local, server))).toEqual(['b@3', 'a@2', 'c@1'])
  })
  test('요청이 날아가는 동안 지운 꿈(아직 서버에 없음)은 되살아나지 않는다', () => {
    expect(mergeItems({ items: [], deleted: [tomb('a', 5)] }, { items: [item('a', 2)], deleted: [] }).items).toEqual([])
  })
  test('빈 쪽과 합치면 그대로', () => {
    expect(titles(mergeItems({ items: [item('a', 1)], deleted: [] }, none))).toEqual(['a@1'])
    expect(titles(mergeItems(none, { items: [item('a', 1)], deleted: [] }))).toEqual(['a@1'])
  })
})

describe('mergeCategories', () => {
  test('A가 지우고(t1) B가 다시 추가(t2)하면 양쪽 모두 살아 있다', () => {
    const a = [{ name: '덕질', at: t(1), deleted: true }]
    const b = [{ name: '덕질', at: t(2), deleted: false }]
    expect(mergeCategories(a, b)).toEqual(b)
    expect(mergeCategories(b, a)).toEqual(b)
  })
  test('같은 시각이면 b(서버), 한쪽에만 있는 이름은 붙인다', () => {
    const a = [{ name: 'x', at: t(1), deleted: false }]
    const b = [{ name: 'x', at: t(1), deleted: true }, { name: 'y', at: t(1), deleted: false }]
    expect(mergeCategories(a, b)).toEqual(b)
  })
})
