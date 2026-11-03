// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest'
import { encodeCard } from '../lib/share-link'
import { loadCard, saveCard } from './short-link.server'

const item = { title: '오로라 보기', why: '', category: null, targetPeriod: null, prerequisites: [], nextAction: { text: '', dueDate: null }, companions: [] }

function stubRedis(result: unknown) {
  vi.stubEnv('KV_REST_API_URL', 'https://redis.test')
  vi.stubEnv('KV_REST_API_TOKEN', 't')
  const fetch = vi.fn(async (_url: string, init: RequestInit) => Response.json({ result: typeof result === 'function' ? result(init) : result }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('같은 카드는 같은 10글자 id로, 1년 보관·없을 때만 저장한다', async () => {
  const fetch = stubRedis('OK')
  const payload = await encodeCard(item)
  const id = await saveCard(payload)
  expect(id).toMatch(/^[A-Za-z0-9_-]{10}$/)
  expect(await saveCard(payload)).toBe(id)
  expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual(['SET', `card:${id}`, payload, 'EX', '31536000', 'NX'])
})

test('뒤에 붙은 글자는 버리고 검증한 부분만 저장한다(같은 카드면 같은 id)', async () => {
  const fetch = stubRedis('OK')
  const payload = await encodeCard(item)
  const id = await saveCard(`${payload} ${'A'.repeat(50_000)}`)
  expect(id).toBe(await saveCard(payload))
  expect(JSON.parse(fetch.mock.calls[0][1].body as string)[2]).toBe(payload)
})

test('IP마다 시간당 30번까지 저장하고, 넘으면 저장하지 않는다', async () => {
  let count = 0
  const fetch = stubRedis((init: RequestInit) => {
    const [command] = JSON.parse(init.body as string) as string[]
    return command === 'INCR' ? ++count : 'OK'
  })
  const payload = await encodeCard(item)
  for (let i = 0; i < 30; i++) await saveCard(payload, '1.2.3.4')
  await expect(saveCard(payload, '1.2.3.4')).rejects.toThrow('RATE_LIMITED')
  const commands = fetch.mock.calls.map(([, init]) => JSON.parse(init.body as string)[0])
  expect(commands.filter((c) => c === 'EXPIRE')).toHaveLength(1)
  expect(commands.filter((c) => c === 'SET')).toHaveLength(30)
})

test('카드가 아닌 것은 저장하지 않는다', async () => {
  const fetch = stubRedis('OK')
  await expect(saveCard('1.garbage')).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})

test('저장소가 설정되지 않으면 throw(클라이언트는 긴 링크로 대신한다)', async () => {
  vi.stubEnv('KV_REST_API_URL', '')
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
  await expect(saveCard(await encodeCard(item))).rejects.toThrow()
})

test('없거나 만료된 id는 null', async () => {
  stubRedis(null)
  expect(await loadCard('abcdefghij')).toBeNull()
})
