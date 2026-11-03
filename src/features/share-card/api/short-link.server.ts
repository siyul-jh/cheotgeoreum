import { redis, withinHourlyLimit } from '@/shared/api/redis.server'
import { decodeShared } from '../lib/share-link'

const TTL_SECONDS = 60 * 60 * 24 * 365 // 1년 보관. 지나면 짧은 링크가 열리지 않는다
// 저장소가 차면 오래된 키부터 지워지니, 한 곳에서 대량으로 넣어 남의 링크를 밀어내지 못하게 IP마다 시간당 횟수를 둔다
const SAVES_PER_HOUR = 30

// 같은 카드는 같은 id(내용 해시)라 여러 번 열어도 한 번만 저장된다.
// ip가 없으면(로컬 개발) 횟수를 세지 않는다. 실패하면 클라이언트는 긴 링크로 대신한다
export async function saveCard(payload: string, ip?: string): Promise<string> {
  await decodeShared(payload) // 카드·목록이 아닌 것(형식·크기·스키마 위반)은 저장하지 않는다
  // 검증한 부분(접두사+base64url)만 저장한다. 뒤에 붙은 글자는 해독에서 무시되니 저장할 이유가 없다
  const canonical = /^(?:L1\.|1\.)[A-Za-z0-9_-]+/.exec(payload)![0]
  if (ip && !(await withinHourlyLimit(`save:${ip}`, SAVES_PER_HOUR))) throw new Error('RATE_LIMITED')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  const id = Buffer.from(digest).toString('base64url').slice(0, 10)
  await redis(['SET', `card:${id}`, canonical, 'EX', String(TTL_SECONDS), 'NX'])
  return id
}

export async function loadCard(id: string): Promise<string | null> {
  const payload = await redis(['GET', `card:${id}`])
  return typeof payload === 'string' ? payload : null
}
