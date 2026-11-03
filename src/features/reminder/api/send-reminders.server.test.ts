// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { createTestDb } from '@/features/dream-sync/api/test-db'
import { sendReminders, sendTestReminder, seoulToday, type Send } from './send-reminders.server'

const { db } = await createTestDb()
afterAll(() => db.close())
beforeEach(() => db.exec('delete from dream; delete from push_subscription; delete from reminder_log'))
const query = async (text: string, params: unknown[]) => {
  const r = await db.query(text, params)
  return { rows: r.rows, rowCount: r.affectedRows ?? 0 }
}

// 2027-02-28 23:30 UTC = 서울 2027-03-01 → '2027-03 이때쯤'의 당일
const NOW = new Date('2027-02-28T23:30:00Z')
const dream = (user: string, id: string, title: string, at: string | null, status = '계획') =>
  db.query('insert into dream (user_id, id, data, updated_at) values ($1, $2, $3, now())', [
    user, id, JSON.stringify({ title, status, targetPeriod: at ? { kind: 'start', at } : null }),
  ])
const subscribe = (user: string, n: number) =>
  db.query('insert into push_subscription (endpoint, user_id, p256dh, auth) values ($1, $2, $3, $4)', [`https://fcm.googleapis.com/${n}`, user, 'p', 'a'])
const run = (send: Send) => sendReminders(NOW, { query, send })

describe('sendReminders', () => {
  test('서울 날짜로 계산하고, 알릴 꿈을 사용자마다 1통으로 묶어 모든 기기에 보낸다', async () => {
    expect(seoulToday(NOW)).toBe('2027-03-01')
    await dream('u1', 'a', '오로라 보기', '2027-03')
    await dream('u1', 'b', '마라톤', '2027-03')
    await dream('u1', 'c', '언젠가', null)
    await dream('u1', 'd', '이룬 꿈', '2027-03', '완료')
    await subscribe('u1', 1)
    await subscribe('u1', 2)
    const send = vi.fn<Send>(async () => {})
    expect(await run(send)).toEqual({ users: 1, sent: 2, failed: 0, pruned: 0 })
    expect(JSON.parse(send.mock.calls[0]![1])).toEqual({ title: '꿈을 떠올려 볼 날이에요', body: '오로라 보기 외 1개', url: '/' })
  })

  test('하나면 그 꿈으로 연다. 같은 날 다시 돌려도 한 번만 보낸다', async () => {
    await dream('u1', 'a', '오로라 보기', '2027-03')
    await subscribe('u1', 1)
    const send = vi.fn<Send>(async () => {})
    await run(send)
    await run(send)
    expect(send).toHaveBeenCalledTimes(1)
    expect(JSON.parse(send.mock.calls[0]![1]).url).toBe('/items/a')
  })

  test('알릴 날이 아니거나 구독이 없으면 보내지 않는다', async () => {
    await dream('u1', 'a', '오로라 보기', '2027-05')
    await dream('u2', 'b', '마라톤', '2027-03')
    await subscribe('u1', 1)
    const send = vi.fn<Send>(async () => {})
    expect(await run(send)).toEqual({ users: 0, sent: 0, failed: 0, pruned: 0 })
  })

  test('410이면 구독을 지우고, 일시 오류로 하나도 못 보냈으면 다음 실행에서 다시 보낸다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await dream('u1', 'a', '오로라 보기', '2027-03')
    await subscribe('u1', 1)
    await subscribe('u1', 2)
    const fail = vi.fn<Send>(async (sub) => {
      throw Object.assign(new Error('x'), { statusCode: sub.endpoint.endsWith('/1') ? 410 : 500 })
    })
    expect(await run(fail)).toEqual({ users: 1, sent: 0, failed: 1, pruned: 1 })
    expect((await db.query('select * from push_subscription')).rows).toHaveLength(1)
    const ok = vi.fn<Send>(async () => {})
    expect((await run(ok)).sent).toBe(1)
    vi.restoreAllMocks()
  })
})

describe('sendTestReminder', () => {
  test('본인 구독에만 보내고, 남의 구독이면 보내지 않는다', async () => {
    await subscribe('u1', 1)
    const send = vi.fn<Send>(async () => {})
    expect(await sendTestReminder('u1', 'https://fcm.googleapis.com/1', { query, send })).toEqual({ ok: true })
    expect(await sendTestReminder('u2', 'https://fcm.googleapis.com/1', { query, send })).toEqual({ ok: false })
    expect(send).toHaveBeenCalledTimes(1)
    expect((await db.query('select * from reminder_log')).rows).toHaveLength(0)
  })

  test('실제 알림과 같은 모양: 오늘 알릴 꿈 → 목표 시기 있는 꿈 → 아무 꿈 순으로 고른다', async () => {
    await subscribe('u1', 1)
    const send = vi.fn<Send>(async () => {})
    const test = () => sendTestReminder('u1', 'https://fcm.googleapis.com/1', { query, send, now: NOW })
    const sent = (i: number) => JSON.parse(send.mock.calls[i]![1])
    await test()
    expect(sent(0)).toMatchObject({ title: '꿈을 떠올려 볼 날이에요', url: '/' })
    await dream('u1', 'a', '언젠가 꿈', null)
    await test()
    expect(sent(1)).toEqual({ title: '꿈을 떠올려 볼 날이에요', body: '언젠가 꿈', url: '/items/a' })
    await dream('u1', 'b', '5월 꿈', '2027-05')
    await test()
    expect(sent(2).body).toBe('5월 꿈')
    await dream('u1', 'c', '3월 꿈', '2027-03')
    await dream('u1', 'd', '이룬 꿈', '2027-03', '완료')
    await test()
    expect(sent(3)).toEqual({ title: '꿈을 떠올려 볼 날이에요', body: '3월 꿈', url: '/items/c' })
  })

  test('사라진 구독(410)이면 지운다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await subscribe('u1', 1)
    const send = vi.fn<Send>(async () => Promise.reject(Object.assign(new Error('gone'), { statusCode: 410 })))
    expect(await sendTestReminder('u1', 'https://fcm.googleapis.com/1', { query, send })).toEqual({ ok: false })
    expect((await db.query('select * from push_subscription')).rows).toHaveLength(0)
  })
})
