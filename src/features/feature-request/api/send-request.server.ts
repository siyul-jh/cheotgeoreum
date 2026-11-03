import { withinHourlyLimit } from '@/shared/api/redis.server'
import type { FeatureRequest, SendResult } from './send-request'

const REPO = 'siyul-jh/cheotgeoreum'
const REQUESTS_PER_HOUR = 5

// 공개 리포에 이슈로 올린다. 내용은 코드 블록에 넣어 @멘션·링크·이미지가 동작하지 않게 한다
export function issueBody(body: string): string {
  return `~~~~text\n${body.replace(/~{4,}/g, '~~~')}\n~~~~\n\n---\n앱의 '기능 요청하기'에서 보낸 요청`
}

// ip가 없으면(로컬 개발) 횟수를 세지 않는다
export async function createIssue({ title, body }: FeatureRequest, ip?: string): Promise<SendResult> {
  try {
    if (ip && !(await withinHourlyLimit(`request:${ip}`, REQUESTS_PER_HOUR))) return { ok: false, code: 'rate' }
    const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_ISSUES_TOKEN ?? ''}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'cheotgeoreum',
      },
      body: JSON.stringify({ title: `[기능 요청] ${title}`, body: issueBody(body) }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`github ${res.status}`)
    return { ok: true, url: ((await res.json()) as { html_url: string }).html_url }
  } catch (error) {
    console.error('[feature-request]', error instanceof Error ? error.message : error)
    return { ok: false, code: 'error' }
  }
}
