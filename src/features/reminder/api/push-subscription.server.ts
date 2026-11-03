import { getQuery, type Query } from '@/shared/api/db.server'
import type { PushSubscriptionInput } from './push-subscription'

const PUSH_HOSTS = ['fcm.googleapis.com', 'push.apple.com', 'updates.push.services.mozilla.com', 'notify.windows.com']
const MAX_PER_USER = 10

// 서버가 이 주소로 요청을 보내므로 브라우저 푸시 서비스만 받는다(점 경계까지 비교)
export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const { protocol, hostname } = new URL(endpoint)
    return protocol === 'https:' && PUSH_HOSTS.some((d) => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

export type SaveResult = { ok: true } | { ok: false; code: 'endpoint' | 'taken' }

export async function savePush(userId: string, sub: PushSubscriptionInput, deps: { query?: Query } = {}): Promise<SaveResult> {
  if (!isAllowedPushEndpoint(sub.endpoint)) return { ok: false, code: 'endpoint' }
  const query = deps.query ?? getQuery()
  // 다른 사용자의 구독 주소는 가져오지 않는다(갱신 0행이면 taken)
  const { rowCount } = await query(
    `insert into push_subscription (endpoint, user_id, p256dh, auth) values ($1, $2, $3, $4)
     on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth
     where push_subscription.user_id = excluded.user_id`,
    [sub.endpoint, userId, sub.keys.p256dh, sub.keys.auth],
  )
  if (rowCount === 0) return { ok: false, code: 'taken' }
  // 기기가 많으면 오래된 것부터 지운다
  await query(
    `delete from push_subscription where user_id = $1 and endpoint not in
     (select endpoint from push_subscription where user_id = $1 order by created_at desc, endpoint limit ${MAX_PER_USER})`,
    [userId],
  )
  return { ok: true }
}

export async function deletePush(userId: string, endpoint: string, deps: { query?: Query } = {}) {
  await (deps.query ?? getQuery())('delete from push_subscription where user_id = $1 and endpoint = $2', [userId, endpoint])
}
