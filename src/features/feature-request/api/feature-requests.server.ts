import { redis, withinHourlyLimit } from '@/shared/api/redis.server'
import type { FeatureRequest, RequestSummary, SendResult } from './feature-requests'

const REPO = 'siyul-jh/cheotgeoreum'
const TITLE_PREFIX = '[기능 요청] '
const REQUESTS_PER_HOUR = 5
const LIST_CACHE_KEY = 'feature-requests'
// 목록을 열 때마다 GitHub을 부르지 않게 잠깐 담아 둔다(토큰 한도 보호). 새 요청을 보내면 지운다
const LIST_CACHE_SECONDS = 60
const BODY_PREVIEW = 300

const github = (path: string, init?: RequestInit) =>
  fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_ISSUES_TOKEN ?? ''}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'cheotgeoreum',
    },
    signal: AbortSignal.timeout(10_000),
  })

// 공개 리포에 이슈로 올린다. 내용은 코드 블록에 넣어 @멘션·링크·이미지가 동작하지 않게 한다
export function issueBody(body: string): string {
  return `~~~~text\n${body.replace(/~{4,}/g, '~~~')}\n~~~~\n\n---\n앱의 '기능 요청하기'에서 보낸 요청`
}

// ip가 없으면(로컬 개발) 횟수를 세지 않는다
export async function createIssue({ title, body }: FeatureRequest, ip?: string): Promise<SendResult> {
  try {
    if (ip && !(await withinHourlyLimit(`request:${ip}`, REQUESTS_PER_HOUR))) return { ok: false, code: 'rate' }
    const res = await github('/issues', { method: 'POST', body: JSON.stringify({ title: TITLE_PREFIX + title, body: issueBody(body) }) })
    if (!res.ok) throw new Error(`github ${res.status}`)
    await redis(['DEL', LIST_CACHE_KEY]).catch(() => {}) // 못 지우면 최대 1분 늦게 보일 뿐
    return { ok: true, url: ((await res.json()) as { html_url: string }).html_url }
  } catch (error) {
    console.error('[feature-request]', error instanceof Error ? error.message : error)
    return { ok: false, code: 'error' }
  }
}

type GithubIssue = {
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  state_reason: string | null
  html_url: string
  created_at: string
  comments: number
  pull_request?: unknown
}

// 앱에서 보낸 요청(제목 접두사)만, 코드 블록 안 내용을 미리보기로
export function toSummaries(issues: GithubIssue[]): RequestSummary[] {
  return issues
    .filter((i) => !i.pull_request && i.title.startsWith(TITLE_PREFIX))
    .map((i) => ({
      number: i.number,
      title: i.title.slice(TITLE_PREFIX.length),
      body: (/^~~~~text\n([\s\S]*?)\n~~~~/.exec(i.body ?? '')?.[1] ?? '').slice(0, BODY_PREVIEW),
      status: i.state === 'open' ? 'open' : i.state_reason === 'completed' ? 'done' : 'closed',
      url: i.html_url,
      createdAt: i.created_at,
      comments: i.comments,
    }))
}

// ponytail: 최근 100개만(페이지 넘김 없음). 요청이 쌓이면 페이지 추가
export async function listRequests(): Promise<RequestSummary[]> {
  const cached = await redis(['GET', LIST_CACHE_KEY]).catch(() => null)
  if (typeof cached === 'string') return JSON.parse(cached) as RequestSummary[]
  const res = await github('/issues?state=all&sort=created&direction=desc&per_page=100')
  if (!res.ok) throw new Error(`github ${res.status}`)
  const list = toSummaries((await res.json()) as GithubIssue[])
  await redis(['SET', LIST_CACHE_KEY, JSON.stringify(list), 'EX', String(LIST_CACHE_SECONDS)]).catch(() => {})
  return list
}
