// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from 'vitest'
import { createTestDb } from '@/features/dream-sync/api/test-db'
import { deletePush, isAllowedPushEndpoint, savePush } from './push-subscription.server'

const { db } = await createTestDb()
afterAll(() => db.close())
beforeEach(() => db.exec('delete from push_subscription'))
const query = async (text: string, params: unknown[]) => {
  const r = await db.query(text, params)
  return { rows: r.rows, rowCount: r.affectedRows ?? 0 }
}
const sub = (n: number | string) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${n}`, keys: { p256dh: 'p', auth: 'a' } })
const owners = async () => (await db.query<{ endpoint: string; user_id: string }>('select endpoint, user_id from push_subscription order by endpoint')).rows

describe('isAllowedPushEndpoint', () => {
  test('브라우저 푸시 서비스만 받는다(점 경계)', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/x')).toBe(true)
    expect(isAllowedPushEndpoint('https://web.push.apple.com/x')).toBe(true)
    expect(isAllowedPushEndpoint('https://evilfcm.googleapis.com.attacker.io/x')).toBe(false)
    expect(isAllowedPushEndpoint('https://notpush.apple.com/x')).toBe(false)
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/x')).toBe(false)
  })
})

describe('savePush / deletePush', () => {
  test('저장하고, 다른 사용자의 같은 주소는 가져오지 않는다', async () => {
    expect(await savePush('u1', sub(1), { query })).toEqual({ ok: true })
    expect(await savePush('u2', sub(1), { query })).toEqual({ ok: false, code: 'taken' })
    expect(await owners()).toEqual([{ endpoint: sub(1).endpoint, user_id: 'u1' }])
  })
  test('허용하지 않는 주소는 거절한다', async () => {
    expect(await savePush('u1', { ...sub(1), endpoint: 'https://attacker.io/x' }, { query })).toEqual({ ok: false, code: 'endpoint' })
  })
  test('11번째 기기를 저장하면 가장 오래된 것을 지운다', async () => {
    for (let i = 0; i < 11; i++) {
      await savePush('u1', sub(String(i).padStart(2, '0')), { query })
      await db.exec(`update push_subscription set created_at = now() - interval '${11 - i} minutes' where endpoint like '%/${String(i).padStart(2, '0')}'`)
    }
    const left = (await owners()).map((r) => r.endpoint.slice(-2))
    expect(left).toHaveLength(10)
    expect(left).not.toContain('00')
  })
  test('지우기는 본인 것만', async () => {
    await savePush('u1', sub(1), { query })
    await deletePush('u2', sub(1).endpoint, { query })
    expect(await owners()).toHaveLength(1)
    await deletePush('u1', sub(1).endpoint, { query })
    expect(await owners()).toHaveLength(0)
  })
})
