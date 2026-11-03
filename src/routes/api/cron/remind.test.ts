// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest'
import { Route } from './remind'

vi.mock('@/features/reminder/api/send-reminders.server', () => ({ sendReminders: async () => ({ users: 0, sent: 0, failed: 0, pruned: 0 }) }))
const GET = (Route.options.server!.handlers as { GET: (ctx: { request: Request }) => Promise<Response> }).GET
const call = (auth?: string) => GET({ request: new Request('http://x/api/cron/remind', { headers: auth ? { authorization: auth } : {} }) })

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

test('CRON_SECRET이 없으면 500(열지 않는다)', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('CRON_SECRET', '')
  expect((await call('Bearer x')).status).toBe(500)
})

test('틀리거나 길이가 다른 헤더는 401, 맞으면 200', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubEnv('CRON_SECRET', 'secret-1234567890')
  expect((await call()).status).toBe(401)
  expect((await call('Bearer secret-1234567899')).status).toBe(401)
  expect((await call('Bearer short')).status).toBe(401)
  const ok = await call('Bearer secret-1234567890')
  expect(ok.status).toBe(200)
  expect(await ok.json()).toEqual({ users: 0, sent: 0, failed: 0, pruned: 0 })
})
