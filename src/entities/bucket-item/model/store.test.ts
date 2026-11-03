import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CATEGORIES, UNCATEGORIZED_FILTER, type BucketItemInput } from './schema'
import { STORAGE_KEY, canImport, parseBackup, selectCategories, selectCompanionNames, serializeBackup, useBucketStore } from './store'

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
  it('randomUUID가 없는 http 접속(보안 컨텍스트 아님)에서도 고유 id로 추가된다', () => {
    const original = crypto.randomUUID
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      const a = s().addItem(input())
      const b = s().addItem(input())
      expect(a).toMatch(/^[0-9a-f]{32}$/)
      expect(a).not.toBe(b)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
    }
  })

  it('달성 기록: 완료가 되는 순간 이룬 시각을 남기고, 다시 저장해도 유지, 완료를 풀면 지운다. 소감은 남는다', () => {
    const id = s().addItem(input())
    expect(s().items[0]!.achievedAt).toBeNull()
    s().updateItem(id, input({ status: '완료' }))
    const at = s().items[0]!.achievedAt
    expect(at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    s().setReflection(id, '생각보다 추웠다')
    s().updateItem(id, input({ status: '완료', why: '고침' }))
    expect(s().items[0]).toMatchObject({ achievedAt: at, reflection: '생각보다 추웠다' })
    s().updateItem(id, input({ status: '진행 중' }))
    expect(s().items[0]).toMatchObject({ achievedAt: null, reflection: '생각보다 추웠다' })
    // 이미 이룬 일을 바로 '완료'로 적어도 기록된다(역방향 버킷리스트)
    s().addItem(input({ status: '완료' }))
    expect(s().items[1]!.achievedAt).toBe(s().items[1]!.createdAt)
  })

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
  expect(saved.version).toBe(3)
  expect(saved.state.items[0]?.title).toBe('저장됨')
})

describe('persist', () => {
  const save = (state: unknown) => localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 2 }))

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

  it('모르는 version으로 저장된 상태는 메모리도 저장소도 덮어쓰지 않는다', async () => {
    s().addItem(input({ title: '내 항목' }))
    const future = JSON.stringify({ state: { items: [], customCategories: [] }, version: 4 })
    localStorage.setItem(STORAGE_KEY, future)
    await useBucketStore.persist.rehydrate()
    expect(s().items.map((i) => i.title)).toEqual(['내 항목'])
    expect(localStorage.getItem(STORAGE_KEY)).toBe(future)
  })

  it('모르는 version 저장본을 읽은 뒤 항목을 추가해도 저장소를 덮어쓰지 않는다', async () => {
    const future = JSON.stringify({ state: { items: [{ id: 'z' }], customCategories: [] }, version: 4 })
    localStorage.setItem(STORAGE_KEY, future)
    await useBucketStore.persist.rehydrate()
    s().addItem(input({ title: '새 항목' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBe(future)
  })

  // AC-T2: version 1 저장본을 그대로 넣고 다시 읽는다
  it('version 1 저장본: 항목을 하나도 버리지 않고 문자열 targetPeriod는 start가 된다', async () => {
    const v1 = {
      state: {
        items: [
          { ...input({ title: '월까지', targetPeriod: null }), targetPeriod: '2027-05', id: 'a', createdAt: '2026-10-01T00:00:00.000Z' },
          { ...input({ title: '연만', targetPeriod: null }), targetPeriod: '2028', id: 'b', createdAt: '2026-10-02T00:00:00.000Z' },
          { ...input({ title: '없음' }), id: 'c', createdAt: '2026-10-03T00:00:00.000Z' },
          { ...input({ title: '이상한 값', targetPeriod: null }), targetPeriod: '내년', id: 'd', createdAt: '2026-10-04T00:00:00.000Z' },
          { ...input({ title: '숫자', targetPeriod: null }), targetPeriod: 2027, id: 'e', createdAt: '2026-10-05T00:00:00.000Z' },
        ],
        customCategories: ['덕질'],
      },
      version: 1,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1))
    await useBucketStore.persist.rehydrate()
    expect(s().items.map((i) => [i.id, i.title, i.targetPeriod])).toEqual([
      ['a', '월까지', { kind: 'start', at: '2027-05' }],
      ['b', '연만', { kind: 'start', at: '2028' }],
      ['c', '없음', null],
      ['d', '이상한 값', null],
      ['e', '숫자', null],
    ])
    expect(s().customCategories).toEqual(['덕질'])
    expect(s().items.map((i) => i.updatedAt)).toEqual(s().items.map((i) => i.createdAt))
    // 옮긴 결과가 version 3으로 다시 저장된다
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { state: { items: unknown[] }; version: number }
    expect(saved.version).toBe(3)
    expect(saved.state.items).toHaveLength(5)
  })

  it('version 2 저장본: 항목 0개 유실, updatedAt = createdAt, 내 카테고리는 오래전 기록, 계정 없음', async () => {
    const items = [0, 1, 2].map((n) => ({ ...input({ title: `꿈${n}` }), id: `v2-${n}`, createdAt: `2026-10-0${n + 1}T00:00:00.000Z` }))
    s().claimLocalData('someone') // 메모리 값이 저장본으로 덮이는지 보려고 먼저(set은 저장소에도 쓴다)
    save({ items, customCategories: ['덕질'] })
    await useBucketStore.persist.rehydrate()
    expect(s().items.map((i) => [i.id, i.updatedAt])).toEqual(items.map((i) => [i.id, i.createdAt]))
    expect(s().categoryLog).toEqual([{ name: '덕질', at: '1970-01-01T00:00:00.000Z', deleted: false }])
    expect(s().deletedIds).toEqual([])
    expect(s().ownerId).toBeNull()
  })

  it('version 3의 동기화 필드가 복원되고, 형식이 틀리면 기본값', async () => {
    const stored = (state: unknown) => localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 3 }))
    stored({ items: [], customCategories: [], categoryLog: [{ name: 'a', at: '2026-01-01T00:00:00.000Z', deleted: true }], deletedIds: [{ id: 'x', deletedAt: '2026-01-01T00:00:00.000Z' }], ownerId: 'u1' })
    await useBucketStore.persist.rehydrate()
    expect([s().categoryLog.length, s().deletedIds.length, s().ownerId]).toEqual([1, 1, 'u1'])
    stored({ items: [], customCategories: [], categoryLog: 'x', deletedIds: null, ownerId: 3 })
    await useBucketStore.persist.rehydrate()
    expect([s().categoryLog, s().deletedIds, s().ownerId]).toEqual([[], [], null])
  })
})

describe('sync fields', () => {
  beforeEach(() => useBucketStore.setState({ categoryLog: [], deletedIds: [], ownerId: null }))

  it('고치면 updatedAt이 오르고, 지우면 흔적이 남는다', () => {
    vi.useFakeTimers({ now: new Date('2026-11-01T00:00:00.000Z') })
    const id = s().addItem(input())
    vi.setSystemTime(new Date('2026-11-02T00:00:00.000Z'))
    s().updateItem(id, input({ title: '수정' }))
    expect(s().items[0].updatedAt).toBe('2026-11-02T00:00:00.000Z')
    s().deleteItem(id)
    expect(s().deletedIds).toEqual([{ id, deletedAt: '2026-11-02T00:00:00.000Z' }])
    vi.useRealTimers()
  })

  it('카테고리 추가·삭제·이름 바꾸기가 기록에 남는다', () => {
    s().addCategory('덕질')
    s().renameCategory('덕질', '공연')
    s().addCategory('독서')
    s().deleteCategory('독서')
    expect(s().categoryLog.map((r) => [r.name, r.deleted])).toEqual([
      ['덕질', true],
      ['공연', false],
      ['독서', true],
    ])
    expect(s().customCategories).toEqual(['공연'])
  })

  it('clearLocalData는 꿈·흔적·카테고리 기록·계정을 모두 비운다', () => {
    s().addCategory('덕질')
    s().deleteItem(s().addItem(input()))
    s().addItem(input())
    s().claimLocalData('u1')
    s().clearLocalData()
    expect([s().items, s().customCategories, s().categoryLog, s().deletedIds, s().ownerId]).toEqual([[], [], [], [], null])
  })

  it('applySynced: 서버 상태와 병합하고, 받은 흔적만 지우고, 서버 흔적은 deletedIds에 넣지 않는다', () => {
    const t = (h: number) => `2026-11-01T0${h}:00:00.000Z`
    const item = (id: string, h: number, title = id) => ({ ...input({ title }), id, createdAt: t(0), updatedAt: t(h) })
    useBucketStore.setState({
      items: [item('mine', 2, '이 기기 최신'), item('old', 1, '이 기기 예전')],
      deletedIds: [{ id: 'gone', deletedAt: t(3) }, { id: 'inflight', deletedAt: t(4) }],
      customCategories: ['덕질'],
      categoryLog: [{ name: '덕질', at: t(1), deleted: false }],
    })
    s().applySynced(
      {
        items: [item('mine', 1, '서버 예전'), item('old', 2, '서버 최신'), item('new', 1, '다른 기기')],
        deleted: [...Array.from({ length: 100 }, (_, i) => ({ id: `srv${i}`, deletedAt: t(1) })), { id: 'gone', deletedAt: t(3) }],
        categories: [{ name: '덕질', at: t(2), deleted: true }, { name: '독서', at: t(2), deleted: false }],
        serverNow: t(5),
      },
      ['gone'],
    )
    expect(s().items.map((i) => i.title)).toEqual(['이 기기 최신', '서버 최신', '다른 기기'])
    expect(s().deletedIds.map((d) => d.id)).toEqual(['inflight'])
    expect(s().customCategories).toEqual(['독서'])
  })

  it('applySynced: serverNow 뒤에 커밋돼 함께 읽힌 행보다 나중에 지운 꿈은 되살아나지 않는다', () => {
    const at = (ms: number) => new Date(Date.parse('2026-11-01T05:00:00.000Z') + ms).toISOString()
    useBucketStore.setState({ items: [], deletedIds: [{ id: 'x', deletedAt: at(20) }] })
    s().applySynced(
      { items: [{ ...input({ title: '다른 기기 편집' }), id: 'x', createdAt: at(0), updatedAt: at(10) }], deleted: [], categories: [], serverNow: at(0) },
      [],
    )
    expect(s().items).toEqual([])
    expect(s().deletedIds[0].deletedAt).toBe(at(11))
  })

  it('touchAll(after): 기기 시계가 늦어도 after보다 1ms 뒤로 올린다', () => {
    useBucketStore.setState({ items: [{ ...input(), id: 'a', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }] })
    s().touchAll('2999-01-01T00:00:00.000Z')
    expect(s().items[0].updatedAt).toBe('2999-01-01T00:00:00.001Z')
  })

  it('applySynced: 기기 시계가 서버보다 1시간 앞서면 서버 시각+1ms로 잘려 계속 이기지 않는다', () => {
    const future = '2026-11-01T06:00:00.000Z'
    useBucketStore.setState({ items: [{ ...input({ title: '미래' }), id: 'a', createdAt: future, updatedAt: future }], deletedIds: [] })
    s().applySynced({ items: [], deleted: [], categories: [], serverNow: '2026-11-01T05:00:00.000Z' }, [])
    expect(s().items[0].updatedAt).toBe('2026-11-01T05:00:00.001Z')
  })
})

describe('backup', () => {
  it('serializeBackup → parseBackup 왕복이 items·customCategories를 보존한다', () => {
    s().addCategory('덕질')
    s().addItem(input({ title: '왕복', category: '덕질', targetPeriod: { kind: 'start', at: '2027-03' } }))
    const { items, customCategories } = s()
    expect(parseBackup(serializeBackup({ items, customCategories }))).toEqual({ items, customCategories })
  })

  it('version 1 백업은 문자열 targetPeriod를 start로 옮긴다', () => {
    const v1 = {
      state: { items: [{ ...input(), targetPeriod: '2027-03', id: 'a', createdAt: '2026-10-01T00:00:00.000Z' }], customCategories: [] },
      version: 1,
    }
    expect(parseBackup(JSON.stringify(v1)).items[0]?.targetPeriod).toEqual({ kind: 'start', at: '2027-03' })
  })

  it('customCategories가 없으면 []', () => {
    const text = JSON.stringify({ state: { items: [] }, version: 2 })
    expect(parseBackup(text)).toEqual({ items: [], customCategories: [] })
  })

  it.each([
    ['version 4', JSON.stringify({ state: { items: [], customCategories: [] }, version: 4 })],
    ['깨진 JSON', '{"state":'],
    ['항목 스키마 위반', JSON.stringify({ state: { items: [{ id: 'x' }], customCategories: [] }, version: 2 })],
    [
      '중복 id',
      JSON.stringify({
        state: { items: [0, 1].map(() => ({ ...input(), id: 'dup', createdAt: '2026-10-01T00:00:00.000Z' })), customCategories: [] },
        version: 2,
      }),
    ],
  ])('parseBackup 거부: %s', (_label, text) => {
    expect(() => parseBackup(text)).toThrow()
  })

  it('version 2 백업도 가져올 수 있다(updatedAt을 채운다)', () => {
    const v2 = { state: { items: [{ ...input(), id: 'a', createdAt: '2026-10-01T00:00:00.000Z' }], customCategories: [] }, version: 2 }
    expect(parseBackup(JSON.stringify(v2)).items[0]?.updatedAt).toBe('2026-10-01T00:00:00.000Z')
  })

  it('저장값 version이 4이면 canImport는 false', () => {
    expect(canImport()).toBe(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { items: [], customCategories: [] }, version: 4 }))
    expect(canImport()).toBe(false)
  })
})
