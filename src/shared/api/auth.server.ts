import { getRequestHeaders } from '@tanstack/react-start/server'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { getPool } from './db.server'

const DAY = 60 * 60 * 24

function createAuth() {
  const { BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET } = process.env
  return betterAuth({
    baseURL: BETTER_AUTH_URL,
    trustedOrigins: BETTER_AUTH_URL ? [BETTER_AUTH_URL] : [],
    database: getPool(),
    session: { expiresIn: 90 * DAY },
    user: { deleteUser: { enabled: true } },
    // 로그인한 상태에서 설정의 [연결하기]로만 구글·카카오를 한 계정에 묶는다.
    // 카카오는 가짜 주소(emailVerified false)라 trusted, 두 주소가 달라 allowDifferentEmails가 필요하다.
    // 이메일이 같다고 로그인 때 저절로 묶이지는 않는다(disableImplicitLinking)
    account: {
      accountLinking: { trustedProviders: ['google', 'kakao'], allowDifferentEmails: true, disableImplicitLinking: true },
    },
    socialProviders: {
      google: { clientId: GOOGLE_CLIENT_ID ?? '', clientSecret: GOOGLE_CLIENT_SECRET ?? '' },
      kakao: {
        clientId: KAKAO_CLIENT_ID ?? '',
        clientSecret: KAKAO_CLIENT_SECRET ?? '',
        // 닉네임만 받는다. 이메일이 없으면 email_not_found로 막히므로 회원번호로 가짜 주소를 만든다.
        // provider getUserInfo가 이 값으로 email을 덮어쓴 뒤에 콜백이 이메일을 검사한다.
        disableDefaultScope: true,
        scope: ['profile_nickname'],
        mapProfileToUser: (profile) => ({ email: `kakao-${profile.id}@users.invalid`, emailVerified: false }),
      },
    },
    // 서버 함수에서 auth.api가 쿠키를 설정할 때 필요하다. 마지막 플러그인이어야 한다
    plugins: [tanstackStartCookies()],
  })
}

let auth: ReturnType<typeof createAuth> | undefined

// env를 호출 시점에 읽도록 지연 생성
export function getAuth() {
  auth ??= createAuth()
  return auth
}

export async function requireUserId(): Promise<string> {
  const session = await getAuth().api.getSession({ headers: getRequestHeaders() })
  if (!session) throw new Error('UNAUTHORIZED')
  return session.user.id
}
