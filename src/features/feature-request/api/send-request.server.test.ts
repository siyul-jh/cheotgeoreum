// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest'
import { createIssue, issueBody } from './send-request.server'

vi.spyOn(console, 'error').mockImplementation(() => {})

// GitHub과 Redis(횟수 세기)를 한 fetch로 흉내 낸다
function stubFetch(githubStatus = 201) {
  vi.stubEnv('KV_REST_API_URL', 'https://redis.test')
  vi.stubEnv('KV_REST_API_TOKEN', 't')
  vi.stubEnv('GITHUB_ISSUES_TOKEN', 'gh')
  let count = 0
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (url.startsWith('https://redis.test')) {
      const [command] = JSON.parse(init.body as string) as string[]
      return Response.json({ result: command === 'INCR' ? ++count : 1 })
    }
    return Response.json({ html_url: 'https://github.com/siyul-jh/cheotgeoreum/issues/1' }, { status: githubStatus })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}
const github = (fetch: ReturnType<typeof stubFetch>) => fetch.mock.calls.filter(([url]) => url.startsWith('https://api.github.com'))

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
  const [[url, init]] = github(fetch)
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
  expect(github(fetch)).toHaveLength(5)
})

test('GitHub이 실패하면 error 코드', async () => {
  stubFetch(401)
  expect(await createIssue({ title: 't', body: 'b' })).toEqual({ ok: false, code: 'error' })
})
