// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { useBucketStore, type BucketItemInput } from '@/entities/bucket-item'
import { runSync } from '../api/sync-dreams.server'
import { createTestDb } from '../api/test-db'
import { applyHeld, reuploadLocal, syncOnce, useSyncStatus, type Send } from './sync'

vi.mock('@/shared/config/limits', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/config/limits')>()),
  SYNC_CHUNK_BYTES: 1_500, // 꿈 몇 개마다 조각이 나뉘게
}))
vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'info').mockImplementation(() => {})

// 클라이언트 동기화 ↔ 실제 서버 로직(runSync) ↔ Postgres(WASM)
const { db, tx } = await createTestDb()
afterAll(() => db.close())
const calls: boolean[] = []
const send: Send = (chunk) => (calls.push(chunk.final), runSync('u1', chunk, { tx }))

const input = (title: string): BucketItemInput => ({
  title, why: '가'.repeat(200), category: null, targetPeriod: null, prerequisites: [], nextAction: { text: '', dueDate: null },
  status: '아이디어', companions: [],
})
const store = () => useBucketStore.getState()
const titles = () => store().items.map((i) => i.title).sort()
// 기기를 바꾼다: 이 기기 저장소를 비우고 같은 계정으로
const switchDevice = () => useBucketStore.setState({ items: [], customCategories: [], categoryLog: [], deletedIds: [], ownerId: 'u1' })

beforeEach(async () => {
  await db.exec('delete from dream; delete from category_log')
  switchDevice()
  useSyncStatus.setState({ status: 'idle', held: null, lastAt: 0, rejected: 0 })
  calls.length = 0
})

test('기기 A에서 올린 꿈·카테고리를 빈 기기 B가 받고, A에서 지운 꿈은 B에서도 지워진다', async () => {
  const ids = ['오로라', '마라톤', '책'].map((t) => store().addItem(input(t)))
  store().addCategory('덕질')
  await syncOnce(send)
  switchDevice()
  await syncOnce(send)
  expect(titles()).toEqual(['마라톤', '오로라', '책'])
  expect(store().customCategories).toEqual(['덕질'])

  // B에서 하나 지우고 올리면 흔적은 받은 뒤 사라진다
  store().deleteItem(ids[0])
  await syncOnce(send)
  expect(store().deletedIds).toEqual([])
  const { rows } = await db.query("select count(*)::int as n from dream where data is null")
  expect(rows).toEqual([{ n: 1 }])
})

test('여러 조각으로 나눠 보내도 중간 조각에서는 축소 가드를 평가하지 않고 전부 올라간다', async () => {
  for (const t of ['a', 'b', 'c', 'd', 'e', 'f']) store().addItem(input(t))
  await syncOnce(send)
  expect(calls.filter((final) => !final).length).toBeGreaterThan(0)
  expect(useSyncStatus.getState().status).toBe('idle')
  switchDevice()
  await syncOnce(send)
  expect(titles()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
})

test('보내는 동안 지운 꿈은 응답을 적용해도 되살아나지 않는다', async () => {
  const id = store().addItem(input('지울 꿈'))
  const slow: Send = async (chunk) => {
    const result = await send(chunk)
    store().deleteItem(id) // 응답이 오기 전에 사용자가 지움
    return result
  }
  await syncOnce(slow)
  expect(store().items).toEqual([])
  expect(store().deletedIds.map((d) => d.id)).toEqual([id])
})

describe('축소 가드', () => {
  test('(a) 10개 중 1개에 대한 더 새 서버 흔적: 멈추지 않고 9개', async () => {
    const ids = Array.from({ length: 10 }, (_, i) => store().addItem(input(`꿈${i}`)))
    await syncOnce(send)
    await runSync('u1', { items: [], deleted: [{ id: ids[0], deletedAt: new Date().toISOString() }], categories: [], final: false, cursor: null, ownerId: 'u1' }, { tx })
    await syncOnce(send)
    expect(useSyncStatus.getState().status).toBe('idle')
    expect(store().items).toHaveLength(9)
  })

  test('절반 이상 사라지면 멈추고, [그래도 적용] 뒤 같은 묶음은 다시 묻지 않으며, 다른 결과면 다시 평가한다', async () => {
    const ids = Array.from({ length: 4 }, (_, i) => store().addItem(input(`꿈${i}`)))
    await syncOnce(send)
    const later = new Date(Date.now() + 1000).toISOString()
    await runSync('u1', { items: [], deleted: ids.slice(0, 2).map((id) => ({ id, deletedAt: later })), categories: [], final: false, cursor: null, ownerId: 'u1' }, { tx })
    await syncOnce(send)
    expect(useSyncStatus.getState().status).toBe('held')
    expect(store().items).toHaveLength(4)

    applyHeld()
    expect(store().items).toHaveLength(2)
    expect(useSyncStatus.getState().status).toBe('idle')
  })

  test('(b) 올린 꿈이 서버 상태에 흔적도 없으면 멈추고, [이 기기 기준으로 다시 올리기]는 updatedAt을 올려 다시 보낸다', async () => {
    store().addItem(input('사라질 꿈'))
    const lossy: Send = async (chunk) => {
      const result = await send({ ...chunk, items: [] }) // 서버가 꿈을 못 받은 것처럼
      return result
    }
    await syncOnce(lossy)
    expect(useSyncStatus.getState().status).toBe('held')

    const before = store().items[0].updatedAt
    await new Promise((r) => setTimeout(r, 5))
    vi.stubGlobal('navigator', { onLine: true })
    await reuploadLocal(send)
    vi.unstubAllGlobals()
    expect(store().items[0].updatedAt > before).toBe(true)
    expect(useSyncStatus.getState().status).toBe('idle')
    const { rows } = await db.query('select count(*)::int as n from dream where data is not null')
    expect(rows).toEqual([{ n: 1 }])
  })
})
