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

type Dream = Row['dreams'][number]
const isLive = (d: Dream) => d.status !== '완료' && d.status !== '포기'

function reminderPayload(due: Dream[]) {
  const first = due[0]!
  return JSON.stringify({
    title: '꿈을 떠올려 볼 날이에요',
    body: due.length === 1 ? first.title : `${first.title} 외 ${due.length - 1}개`,
    url: due.length === 1 ? `/items/${first.id}` : '/',
  })
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
    const due = subs[0]!.dreams.filter((d) => isLive(d) && shouldRemind(d.targetPeriod, today))
    if (due.length === 0) continue
    const claimed = await query('insert into reminder_log (user_id, sent_on) values ($1, $2) on conflict do nothing', [userId, today])
    if (claimed.rowCount === 0) continue
    result.users += 1
    const payload = reminderPayload(due)
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

// 설정의 '시험 알림'. 실제 알림과 같은 모양으로 이 기기(본인 구독)에만, 기록 없이 바로 보낸다
// 오늘 알릴 꿈이 있으면 그 꿈, 없으면 목표 시기가 있는 꿈, 그것도 없으면 살아 있는 꿈으로 미리 보여 준다
// ponytail: 횟수 제한 없음. 본인 기기에만 가므로 남용해도 자기만 시끄럽다. 푸시 서버가 막는다는 말이 나오면 Upstash 제한
export async function sendTestReminder(userId: string, endpoint: string, deps: { query?: Query; send?: Send; now?: Date } = {}) {
  const query = deps.query ?? getQuery()
  const send = deps.send ?? defaultSend
  const { rows } = (await query('select endpoint, p256dh, auth from push_subscription where endpoint = $1 and user_id = $2', [endpoint, userId])) as { rows: Sub[] }
  const sub = rows[0]
  if (!sub) return { ok: false as const }
  try {
    const { rows: dreams } = (await query(
      `select id, data->>'title' as title, data->'targetPeriod' as "targetPeriod", data->>'status' as status from dream where user_id = $1 and data is not null`,
      [userId],
    )) as { rows: Dream[] }
    const live = dreams.filter(isLive)
    const today = seoulToday(deps.now ?? new Date())
    const pick = [live.filter((d) => shouldRemind(d.targetPeriod, today)), live.filter((d) => d.targetPeriod), live].find((l) => l.length > 0)
    const payload = pick ? reminderPayload(pick) : JSON.stringify({ title: '꿈을 떠올려 볼 날이에요', body: '목표 시기를 정한 꿈이 있으면 이렇게 알려 드려요.', url: '/' })
    const res = await send(sub, payload)
    // 푸시 서버가 받았는지(201) 로그로 남긴다. 주소는 호스트만
    console.info('[remind] test sent', new URL(endpoint).hostname, (res as { statusCode?: number } | undefined)?.statusCode)
    return { ok: true as const }
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) await query('delete from push_subscription where endpoint = $1', [endpoint])
    console.error('[remind] test send failed', status)
    return { ok: false as const }
  }
}
