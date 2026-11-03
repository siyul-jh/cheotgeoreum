// Upstash Redis REST(Vercel Marketplace 연결 시 KV_REST_API_* 가 들어온다). 의존성 없이 fetch로 부른다
export async function redis(command: string[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Redis 저장소가 설정되지 않았다')
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5_000),
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  return ((await res.json()) as { result: unknown }).result
}

// 1시간에 limit번을 넘으면 false. 로그인 없이 부르는 기능의 남용을 IP마다 막는다
// ponytail: 고정 1시간 창(INCR 후 첫 요청에만 EXPIRE). 창 경계에서 최대 2배까지 허용
export async function withinHourlyLimit(key: string, limit: number): Promise<boolean> {
  const count = Number(await redis(['INCR', `rl:${key}`]))
  if (count === 1) await redis(['EXPIRE', `rl:${key}`, '3600'])
  return count <= limit
}
