import { getRequestHeaders } from '@tanstack/react-start/server'
import { APIError } from 'better-auth/api'
import { getAuth } from '@/shared/api/auth.server'
import { getQuery, type Query } from '@/shared/api/db.server'

export type DeleteAccountResult = { ok: true } | { code: 'reauth' }
type Deps = { query?: Query; deleteUser?: () => Promise<unknown>; fetch?: typeof fetch }

// 탈퇴: 세션 사용자의 카카오 회원번호를 DB에서 먼저 읽고(클라이언트 입력은 쓰지 않는다) 계정을 지운 뒤 카카오 연결을 끊는다.
// 꿈·푸시 구독 등은 user FK on delete cascade로 함께 지워진다
export async function deleteAccount(userId: string, deps: Deps = {}): Promise<DeleteAccountResult> {
  const query = deps.query ?? getQuery()
  const { rows } = await query('select "accountId" from "account" where "userId" = $1 and "providerId" = $2', [userId, 'kakao'])
  const kakaoId = (rows[0] as { accountId: string } | undefined)?.accountId
  try {
    await (deps.deleteUser ?? (() => getAuth().api.deleteUser({ body: {}, headers: getRequestHeaders() })))()
  } catch (error) {
    // 로그인한 지 하루(freshAge)가 지난 세션은 Better Auth가 탈퇴를 거절한다 → 다시 로그인하게 한다
    if (error instanceof APIError && error.body?.code === 'SESSION_EXPIRED') return { code: 'reauth' }
    throw error
  }
  // ponytail: 연결 끊기는 best-effort. 실패해도 계정은 이미 지워졌으니 막지 않고 로그만 남긴다
  if (kakaoId) {
    try {
      const res = await (deps.fetch ?? fetch)('https://kapi.kakao.com/v1/user/unlink', {
        method: 'POST',
        headers: { Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY ?? ''}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ target_id_type: 'user_id', target_id: kakaoId }),
        signal: AbortSignal.timeout(5_000),
      })
      if (!res.ok) console.error('[auth] kakao unlink', res.status)
    } catch (error) {
      console.error('[auth] kakao unlink', error)
    }
  }
  return { ok: true }
}
