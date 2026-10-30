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
