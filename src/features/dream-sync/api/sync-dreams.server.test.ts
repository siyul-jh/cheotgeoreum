// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { BucketItem } from '@/entities/bucket-item'
import { runSync } from './sync-dreams.server'
import type { SyncChunk } from './sync-schema'
import { createTestDb } from './test-db'

vi.mock('@/shared/config/limits', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/config/limits')>()),
  MAX_DREAMS: 3,
  SYNC_CHUNK_BYTES: 2_000,
}))

const { db, tx } = await createTestDb()
afterAll(() => db.close())
beforeEach(() => db.exec('delete from dream; delete from category_log'))

const t = (h: number) => `2026-11-01T${String(h).padStart(2, '0')}:00:00.000Z`
const item = (id: string, h: number, title = `${id}@${h}`): BucketItem => ({
  id, title, why: '', category: null, targetPeriod: null, prerequisites: [], nextAction: { text: '', dueDate: null },
  status: '아이디어', companions: [], createdAt: t(0), updatedAt: t(h),
})
const chunk = (over: Partial<SyncChunk>, user: string): SyncChunk => ({ items: [], deleted: [], categories: [], final: true, cursor: null, ownerId: user, ...over })
const sync = (over: Partial<SyncChunk>, user = 'u1') => runSync(user, chunk(over, user), { tx })
const state = async (user = 'u1') => {
  const { snapshot } = await sync({}, user)
  return { live: snapshot!.items.map((i) => i.title), gone: snapshot!.deleted.map((d) => d.id) }
}

describe('병합 규칙(시나리오 표)', () => {
  test('편집 t1 → 삭제 t2: 삭제', async () => {
    await sync({ items: [item('a', 1)] })
    await sync({ deleted: [{ id: 'a', deletedAt: t(2) }] })
    expect(await state()).toEqual({ live: [], gone: ['a'] })
  })
  test('삭제 t2 → 편집 t1: 삭제 유지, 편집 t3: 되살아남', async () => {
    await sync({ items: [item('a', 0)] })
    await sync({ deleted: [{ id: 'a', deletedAt: t(2) }] })
    await sync({ items: [item('a', 1)] })
    expect(await state()).toEqual({ live: [], gone: ['a'] })
    await sync({ items: [item('a', 3)] })
    expect(await state()).toEqual({ live: ['a@3'], gone: [] })
  })
  test('같은 시각이면 서버 유지(편집 t1 → 삭제 t1, 편집 t1 → 편집 t1)', async () => {
    await sync({ items: [item('a', 1, '처음')] })
    await sync({ deleted: [{ id: 'a', deletedAt: t(1) }] })
    await sync({ items: [item('a', 1, '같은 시각')] })
    expect(await state()).toEqual({ live: ['처음'], gone: [] })
  })
  test('미래 시각은 서버 now()로 잘리고 응답의 updatedAt이 그 값이다', async () => {
    const { snapshot } = await sync({ items: [{ ...item('a', 0), updatedAt: '2999-01-01T00:00:00.000Z' }] })
    expect(Date.parse(snapshot!.items[0].updatedAt)).toBeLessThanOrEqual(Date.parse(snapshot!.serverNow))
  })
  test('카테고리: 삭제 t1 → 다시 추가 t2는 살아 있고, 더 오래된 기록은 무시', async () => {
    await sync({ categories: [{ name: '덕질', at: t(1), deleted: true }] })
    await sync({ categories: [{ name: '덕질', at: t(2), deleted: false }] })
    const { snapshot } = await sync({ categories: [{ name: '덕질', at: t(1), deleted: true }] })
    expect(snapshot!.categories).toEqual([{ name: '덕질', at: t(2), deleted: false }])
  })
})

test('서버에 없는 꿈의 흔적은 행을 만들지 않고 ack만 한다', async () => {
  const result = await sync({ deleted: [{ id: 'never', deletedAt: t(1) }] })
  expect(result.ackedDeleted).toEqual(['never'])
  const { rows } = await db.query('select count(*)::int as n from dream')
  expect(rows).toEqual([{ n: 0 }])
})

test('보내는 기기가 믿는 주인이 세션 사용자와 다르면 아무것도 반영하지 않고 거절한다', async () => {
  await expect(runSync('u2', chunk({ items: [item('a', 1)] }, 'u1'), { tx })).rejects.toThrow('OWNER_MISMATCH')
  const { rows } = await db.query('select count(*)::int as n from dream')
  expect(rows).toEqual([{ n: 0 }])
})

test('사용자마다 따로: 다른 사용자의 같은 id는 별개 행', async () => {
  await sync({ items: [item('a', 1, '내 꿈')] })
  await sync({ items: [item('a', 2, '남의 꿈')] }, 'u2')
  expect(await state('u1')).toEqual({ live: ['내 꿈'], gone: [] })
  expect(await state('u2')).toEqual({ live: ['남의 꿈'], gone: [] })
})

test('같은 id를 두 번 보내도(한 요청 안·다시 동기화) 행은 하나', async () => {
  await sync({ items: [item('a', 1), item('a', 2)] })
  await sync({ items: [item('a', 2)] })
  const { rows } = await db.query('select count(*)::int as n from dream where user_id = $1', ['u1'])
  expect(rows).toEqual([{ n: 1 }])
  expect(await state()).toEqual({ live: ['a@2'], gone: [] })
})

test('상한을 넘는 새 꿈과 형식이 틀린 꿈은 rejected, 나머지와 기존 꿈 편집은 반영', async () => {
  await sync({ items: [item('a', 1), item('b', 1), item('c', 1)] })
  const result = await sync({ items: [item('a', 2), item('d', 1), { id: 'bad', title: '' }] })
  expect(result.rejected).toEqual([{ id: 'bad', reason: 'invalid' }, { id: 'd', reason: 'limit' }])
  expect(result.snapshot!.items.map((i) => i.title)).toEqual(['a@2', 'b@1', 'c@1'])
})

test('ackedDeleted에는 더 새 서버 편집에 진 흔적도 들어 있다', async () => {
  await sync({ items: [item('a', 5)] })
  const result = await sync({ deleted: [{ id: 'a', deletedAt: t(1) }, { id: 'b', deletedAt: t(1) }] })
  expect(result.ackedDeleted).toEqual(['a', 'b'])
  expect(result.snapshot!.items.map((i) => i.title)).toEqual(['a@5'])
})

test('마지막 조각이 아니면 snapshot이 없다', async () => {
  expect((await sync({ items: [item('a', 1)], final: false })).snapshot).toBeNull()
})

test('상태가 바이트 상한을 넘으면 id 순 페이지로 나눠 빠짐없이 돌려준다', async () => {
  const long = (id: string) => ({ ...item(id, 1), why: '가'.repeat(300) })
  await sync({ items: [long('a'), long('b'), long('c')] })
  // 지운 흔적 30행(다른 기기들이 지운 꿈)
  await db.query(`insert into dream (user_id, id, data, updated_at, deleted_at)
    select 'u1', 'z' || lpad(g::text, 2, '0'), null, now(), now() from generate_series(0, 29) g`)
  const seen: string[] = []
  let cursor: string | null = null
  let pages = 0
  do {
    const { snapshot } = await sync({ cursor })
    seen.push(...snapshot!.items.map((i) => i.id), ...snapshot!.deleted.map((d) => d.id))
    cursor = snapshot!.nextCursor
    pages += 1
  } while (cursor !== null && pages < 20)
  expect(pages).toBeGreaterThan(1)
  expect(seen).toHaveLength(33)
  expect(new Set(seen).size).toBe(33)
})
