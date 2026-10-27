import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CATEGORIES, UNCATEGORIZED_FILTER, type BucketItemInput } from './schema'
import { STORAGE_KEY, selectCategories, selectCompanionNames, useBucketStore } from './store'

const input = (over: Partial<BucketItemInput> = {}): BucketItemInput => ({
  title: '오로라 보기',
  why: '',
  category: null,
  targetPeriod: null,
  prerequisites: [],
  nextAction: { text: '', dueDate: null },
  status: '아이디어',
  companions: [],
  ...over,
})

const s = () => useBucketStore.getState()

beforeEach(() => {
  localStorage.clear()
  useBucketStore.setState({ items: [], customCategories: [] })
})

describe('items', () => {
  it('추가, 수정, 삭제', () => {
    const id = s().addItem(input())
    expect(s().items).toHaveLength(1)
    s().updateItem(id, input({ title: '수정' }))
    expect(s().items[0]).toMatchObject({ id, title: '수정' })
    s().deleteItem(id)
    expect(s().items).toHaveLength(0)
  })
})

describe('categories', () => {
  it('사용자 카테고리 삭제 시 항목 category가 null', () => {
    expect(s().addCategory('덕질')).toBe(true)
    s().addItem(input({ category: '덕질' }))
    s().deleteCategory('덕질')
    expect(s().items[0]?.category).toBeNull()
    expect(selectCategories(s())).toEqual([...DEFAULT_CATEGORIES])
  })

  it('기본 카테고리는 삭제되지 않는다', () => {
    s().addItem(input({ category: '여행' }))
    s().deleteCategory('여행')
    expect(s().items[0]?.category).toBe('여행')
    expect(selectCategories(s())).toContain('여행')
  })

  it.each([
    ['이미 있는 이름', '여행'],
    ['31자', 'a'.repeat(31)],
    ['공백만', '   '],
    ['미분류', '미분류'],
    ['예약값', UNCATEGORIZED_FILTER],
  ])('addCategory 거부: %s', (_label, name) => {
    expect(s().addCategory(name)).toBe(false)
    expect(s().customCategories).toEqual([])
  })

  it('중복 사용자 카테고리 거부, trim 저장', () => {
    expect(s().addCategory(' 덕질 ')).toBe(true)
    expect(s().addCategory('덕질')).toBe(false)
    expect(s().customCategories).toEqual(['덕질'])
  })
})

it('selectCompanionNames: 중복 제거 후 정렬', () => {
  s().addItem(input({ companions: ['철수', '민수'] }))
  s().addItem(input({ companions: ['철수', '가영'] }))
  expect(selectCompanionNames(s())).toEqual(['가영', '민수', '철수'])
})

it('변경이 localStorage에 반영된다', () => {
  s().addItem(input({ title: '저장됨' }))
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { state: { items: { title: string }[] }; version: number }
  expect(saved.version).toBe(1)
  expect(saved.state.items[0]?.title).toBe('저장됨')
})

describe('persist', () => {
  const save = (state: unknown) => localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 1 }))

  it('다른 탭이 저장하면 그 내용을 다시 읽는다', async () => {
    s().addItem(input({ title: '이 탭' }))
    save({ items: [{ ...input({ title: '다른 탭' }), id: 'x', createdAt: '2026-10-27T00:00:00.000Z' }], customCategories: ['덕질'] })
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
    await vi.waitFor(() => expect(s().items.map((i) => i.title)).toEqual(['다른 탭']))
    expect(s().customCategories).toEqual(['덕질'])
  })

  it('저장된 items·customCategories가 배열이 아니면 빈 목록', async () => {
    save({ items: 'x', customCategories: null })
    await useBucketStore.persist.rehydrate()
    expect(s().items).toEqual([])
    expect(s().customCategories).toEqual([])
    expect(selectCompanionNames(s())).toEqual([])
  })

  it('다른 version으로 저장된 상태를 읽어도 메모리 상태를 비우지 않는다', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    s().addItem(input({ title: '내 항목' }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { items: [], customCategories: [] }, version: 2 }))
    await useBucketStore.persist.rehydrate()
    expect(s().items.map((i) => i.title)).toEqual(['내 항목'])
    err.mockRestore()
  })
})
