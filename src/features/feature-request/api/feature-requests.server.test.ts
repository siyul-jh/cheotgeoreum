// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest'
import { createIssue, issueBody, listRequests, toSummaries } from './feature-requests.server'

vi.spyOn(console, 'error').mockImplementation(() => {})

const issue = (n: number, title: string, extra: object = {}) => ({
  number: n,
  title,
  body: issueBody(`내용 ${n}`),
  state: 'open',
  state_reason: null,
  html_url: `https://github.com/siyul-jh/cheotgeoreum/issues/${n}`,
  created_at: '2026-11-03T00:00:00Z',
  comments: 0,
  ...extra,
})

// GitHub과 Redis(횟수 세기·목록 캐시)를 한 fetch로 흉내 낸다
function stubFetch({ githubStatus = 201, issues = [] as object[] } = {}) {
  vi.stubEnv('KV_REST_API_URL', 'https://redis.test')
  vi.stubEnv('KV_REST_API_TOKEN', 't')
  vi.stubEnv('GITHUB_ISSUES_TOKEN', 'gh')
  let count = 0
  const store = new Map<string, string>()
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (url.startsWith('https://redis.test')) {
      const [command, key, value] = JSON.parse(init.body as string) as string[]
      if (command === 'INCR') return Response.json({ result: ++count })
      if (command === 'GET') return Response.json({ result: store.get(key) ?? null })
      if (command === 'SET') store.set(key, value)
      if (command === 'DEL') store.delete(key)
      return Response.json({ result: 'OK' })
    }
    if (init.method === 'POST') return Response.json({ html_url: 'https://github.com/siyul-jh/cheotgeoreum/issues/1' }, { status: githubStatus })
    return Response.json(issues, { status: githubStatus === 201 ? 200 : githubStatus })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}
const githubCalls = (fetch: ReturnType<typeof stubFetch>) => fetch.mock.calls.filter(([url]) => url.startsWith('https://api.github.com'))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('제목에 [기능 요청]을 붙여 이슈를 만들고 주소를 돌려준다', async () => {
  const fetch = stubFetch()
  expect(await createIssue({ title: '알림', body: '매일 아침 알려 주세요' })).toEqual({
    ok: true,
    url: 'https://github.com/siyul-jh/cheotgeoreum/issues/1',
  })
  const [[url, init]] = githubCalls(fetch)
  expect(url).toBe('https://api.github.com/repos/siyul-jh/cheotgeoreum/issues')
  expect(JSON.parse(init.body as string).title).toBe('[기능 요청] 알림')
})

test('내용은 코드 블록에 넣고, 안에서 블록을 닫는 ~~~~ 는 줄인다', () => {
  expect(issueBody('@someone ~~~~~ 탈출')).toBe("~~~~text\n@someone ~~~ 탈출\n~~~~\n\n---\n앱의 '기능 요청하기'에서 보낸 요청")
})

test('IP마다 시간당 5번까지 보내고, 넘으면 GitHub을 부르지 않는다', async () => {
  const fetch = stubFetch()
  for (let i = 0; i < 5; i++) expect((await createIssue({ title: 't', body: 'b' }, '1.2.3.4')).ok).toBe(true)
  expect(await createIssue({ title: 't', body: 'b' }, '1.2.3.4')).toEqual({ ok: false, code: 'rate' })
  expect(githubCalls(fetch)).toHaveLength(5)
})

test('GitHub이 실패하면 error 코드', async () => {
  stubFetch({ githubStatus: 401 })
  expect(await createIssue({ title: 't', body: 'b' })).toEqual({ ok: false, code: 'error' })
})

test('목록은 앱에서 보낸 요청만, 접두사를 떼고 코드 블록 안 내용과 상태를 담는다', () => {
  expect(
    toSummaries([
      issue(3, '[기능 요청] 알림', { state: 'closed', state_reason: 'completed', comments: 2 }),
      issue(2, '버그: 로그인'),
      issue(1, '[기능 요청] PR', { pull_request: {} }),
      issue(4, '[기능 요청] 다크', { state: 'closed', state_reason: 'not_planned' }),
    ] as Parameters<typeof toSummaries>[0]),
  ).toEqual([
    { number: 3, title: '알림', body: '내용 3', status: 'done', url: 'https://github.com/siyul-jh/cheotgeoreum/issues/3', createdAt: '2026-11-03T00:00:00Z', comments: 2 },
    { number: 4, title: '다크', body: '내용 4', status: 'closed', url: 'https://github.com/siyul-jh/cheotgeoreum/issues/4', createdAt: '2026-11-03T00:00:00Z', comments: 0 },
  ])
})

test('목록은 1분 동안 캐시하고, 새 요청을 보내면 캐시를 지워 다시 읽는다', async () => {
  const fetch = stubFetch({ issues: [issue(1, '[기능 요청] 알림')] })
  expect(await listRequests()).toHaveLength(1)
  await listRequests()
  expect(githubCalls(fetch)).toHaveLength(1)
  await createIssue({ title: 't', body: 'b' })
  await listRequests()
  expect(githubCalls(fetch).filter(([, init]) => init.method !== 'POST')).toHaveLength(2)
})
