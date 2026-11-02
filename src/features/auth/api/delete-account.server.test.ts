// @vitest-environment node
import { APIError } from 'better-auth/api'
import { afterEach, expect, test, vi } from 'vitest'
import { deleteAccount } from './delete-account.server'

vi.mock('@tanstack/react-start/server', () => ({ getRequestHeaders: () => new Headers() }))
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

function setup(rows: unknown[], deleteUser = vi.fn(async () => {})) {
  const calls: string[] = []
  const query = vi.fn(async (_text: string, params: unknown[]) => (calls.push(`query:${params.join(',')}`), { rows, rowCount: rows.length }))
  const del = vi.fn(async () => (calls.push('delete'), deleteUser()))
  const fetch = vi.fn<typeof globalThis.fetch>(async () => (calls.push('unlink'), new Response('{}')))
  return { calls, query, deleteUser: del, fetch }
}

test('세션 사용자의 카카오 회원번호를 DB에서 읽고, 계정을 지운 뒤에 어드민 키로 연결을 끊는다', async () => {
  vi.stubEnv('KAKAO_ADMIN_KEY', 'admin-key')
  const deps = setup([{ accountId: '4242' }])
  expect(await deleteAccount('u1', deps)).toEqual({ ok: true })
  expect(deps.calls).toEqual(['query:u1,kakao', 'delete', 'unlink'])
  const [url, init] = deps.fetch.mock.calls[0]
  expect(url).toBe('https://kapi.kakao.com/v1/user/unlink')
  expect(new Headers(init?.headers).get('Authorization')).toBe('KakaoAK admin-key')
  expect(String(init?.body)).toBe('target_id_type=user_id&target_id=4242')
})

test('카카오 연결이 없으면 연결 끊기를 부르지 않는다', async () => {
  const deps = setup([])
  expect(await deleteAccount('u1', deps)).toEqual({ ok: true })
  expect(deps.fetch).not.toHaveBeenCalled()
})

test('연결 끊기가 실패해도 탈퇴는 성공이다', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const deps = setup([{ accountId: '4242' }])
  deps.fetch.mockRejectedValueOnce(new Error('network'))
  expect(await deleteAccount('u1', deps)).toEqual({ ok: true })
  expect(console.error).toHaveBeenCalledWith('[auth] kakao unlink', expect.any(Error))
})

test('오래된 세션(SESSION_EXPIRED)은 reauth를 돌려주고 연결을 끊지 않는다. 다른 오류는 그대로 던진다', async () => {
  const expired = setup([{ accountId: '4242' }], vi.fn(async () => {
    throw APIError.from('BAD_REQUEST', { code: 'SESSION_EXPIRED', message: 'expired' })
  }))
  expect(await deleteAccount('u1', expired)).toEqual({ code: 'reauth' })
  expect(expired.fetch).not.toHaveBeenCalled()

  const broken = setup([{ accountId: '4242' }], vi.fn(async () => {
    throw new Error('db down')
  }))
  await expect(deleteAccount('u1', broken)).rejects.toThrow('db down')
  expect(broken.fetch).not.toHaveBeenCalled()
})
