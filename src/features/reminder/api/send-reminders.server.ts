import { DateTime } from 'luxon'
import webpush from 'web-push'
import { shouldRemind, type TargetPeriod } from '@/entities/bucket-item'
import { getQuery, type Query } from '@/shared/api/db.server'

type Sub = { endpoint: string; p256dh: string; auth: string }
export type Send = (sub: Sub, payload: string) => Promise<unknown>
type Row = Sub & { user_id: string; dreams: { id: string; title: string; targetPeriod: TargetPeriod | null; status: string }[] }

// ponytail: 시간대는 전원 서울. 해외 사용자가 생기면 사용자별 시간대 컬럼
export const seoulToday = (now: Date) => DateTime.fromJSDate(now).setZone('Asia/Seoul').toISODate()!

const defaultSend: Send = (sub, payload) => {
  // env는 호출 시점에 읽는다
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'https://cheotgeoreum-app.vercel.app', process.env.VITE_VAPID_PUBLIC_KEY ?? '', process.env.VAPID_PRIVATE_KEY ?? '')
  return webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
}

// 오늘이 목표 시기의 알림 날인 꿈을 사용자마다 묶어 1통씩 보낸다. 같은 날 다시 돌려도 한 번만 간다
export async function sendReminders(now: Date, deps: { query?: Query; send?: Send } = {}) {
  const query = deps.query ?? getQuery()
  const send = deps.send ?? defaultSend
  const today = seoulToday(now)
  // 알림을 켠 사용자(구독이 있는 사람)의 살아 있는 꿈만
  const { rows } = (await query(
    `select s.user_id, s.endpoint, s.p256dh, s.auth,
       coalesce((select json_agg(json_build_object('id', d.id, 'title', d.data->>'title', 'targetPeriod', d.data->'targetPeriod', 'status', d.data->>'status'))
         from dream d where d.user_id = s.user_id and d.data is not null), '[]') as dreams
     from push_subscription s`,
    [],
  )) as { rows: Row[] }

  const byUser = new Map<string, Row[]>()
  for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r])
  const result = { users: 0, sent: 0, failed: 0, pruned: 0 }
  for (const [userId, subs] of byUser) {
    const due = subs[0]!.dreams.filter((d) => d.status !== '완료' && d.status !== '포기' && shouldRemind(d.targetPeriod, today))
    if (due.length === 0) continue
    const claimed = await query('insert into reminder_log (user_id, sent_on) values ($1, $2) on conflict do nothing', [userId, today])
    if (claimed.rowCount === 0) continue
    result.users += 1
    const first = due[0]!
    const payload = JSON.stringify({
      title: '꿈을 떠올려 볼 날이에요',
      body: due.length === 1 ? first.title : `${first.title} 외 ${due.length - 1}개`,
      url: due.length === 1 ? `/items/${first.id}` : '/',
    })
    let delivered = 0
    let failed = 0
    for (const sub of subs) {
      try {
        await send(sub, payload)
        delivered += 1
        result.sent += 1
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        // 사라진 구독(앱 삭제·권한 해제)은 지운다
        if (status === 404 || status === 410) {
          await query('delete from push_subscription where endpoint = $1', [sub.endpoint])
          result.pruned += 1
        } else {
          failed += 1
          result.failed += 1
          console.error('[remind] send failed', status)
        }
      }
    }
    // 어느 기기에도 못 보냈고 일시 오류가 있었으면 기록을 지워 다음 실행에서 다시 보낸다
    if (delivered === 0 && failed > 0) await query('delete from reminder_log where user_id = $1 and sent_on = $2', [userId, today])
  }
  return result
}
