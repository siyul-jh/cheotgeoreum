// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getAuth, requireUserId } from './auth.server'

vi.mock('@tanstack/react-start/server', () => ({ getRequestHeaders: () => new Headers() }))

beforeEach(() => {
  // Pool은 만들기만 하고 연결하지 않는다(실제 DB 없음)
  vi.stubEnv('DATABASE_URL', 'postgres://u:p@localhost:5432/test')
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-test-secret-test-secret-00')
  vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000')
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

test('requireUserId: 세션이 없으면 UNAUTHORIZED를 던진다', async () => {
  vi.spyOn(getAuth().api, 'getSession').mockResolvedValue(null)
  await expect(requireUserId()).rejects.toThrow('UNAUTHORIZED')
})

test('requireUserId: 세션이 있으면 user.id를 돌려준다', async () => {
  const session = { user: { id: 'u1' }, session: {} } as Awaited<ReturnType<ReturnType<typeof getAuth>['api']['getSession']>>
  vi.spyOn(getAuth().api, 'getSession').mockResolvedValue(session)
  await expect(requireUserId()).resolves.toBe('u1')
})

test('카카오: 회원번호로 검증 안 된 가짜 이메일을 만든다(닉네임만 요청)', async () => {
  const kakao = getAuth().options.socialProviders?.kakao
  expect(kakao?.scope).toEqual(['profile_nickname'])
  expect(kakao?.disableDefaultScope).toBe(true)
  expect(await kakao?.mapProfileToUser?.({ id: 123 } as Parameters<NonNullable<NonNullable<typeof kakao>['mapProfileToUser']>>[0])).toEqual({
    email: 'kakao-123@users.invalid',
    emailVerified: false,
  })
})

test('계정 연결: 구글·카카오를 직접 연결로만 묶고, 이메일이 같아도 저절로 묶지 않는다', () => {
  expect(getAuth().options.account?.accountLinking).toEqual({
    trustedProviders: ['google', 'kakao'],
    allowDifferentEmails: true,
    disableImplicitLinking: true,
  })
})
