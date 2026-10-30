import { decodeCard } from '../lib/share-link'

const TTL_SECONDS = 60 * 60 * 24 * 365 // 1년 보관. 지나면 짧은 링크가 열리지 않는다

// Upstash Redis REST(Vercel Marketplace 연결 시 KV_REST_API_* 가 들어온다). 의존성 없이 fetch로 부른다
async function redis(command: string[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('짧은 링크 저장소가 설정되지 않았다')
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5_000),
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  return ((await res.json()) as { result: unknown }).result
}

// 같은 카드는 같은 id(내용 해시)라 여러 번 열어도 한 번만 저장된다.
// ponytail: 요청 수 제한 없음. 남용되면 IP별 rate limit 추가
export async function saveCard(payload: string): Promise<string> {
  await decodeCard(payload) // 카드가 아닌 것(형식·크기·스키마 위반)은 저장하지 않는다
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  const id = Buffer.from(digest).toString('base64url').slice(0, 10)
  await redis(['SET', `card:${id}`, payload, 'EX', String(TTL_SECONDS), 'NX'])
  return id
}

export async function loadCard(id: string): Promise<string | null> {
  const payload = await redis(['GET', `card:${id}`])
  return typeof payload === 'string' ? payload : null
}
