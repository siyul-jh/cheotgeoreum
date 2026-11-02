import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { authClient } from '@/shared/api/auth-client'
import { LoginPanel } from './login-panel'

const PROVIDER_NAMES = { google: '구글', kakao: '카카오' } as const
type Provider = keyof typeof PROVIDER_NAMES

export function AccountSection() {
  const { data, isPending } = authClient.useSession()
  return (
    <section aria-labelledby="settings-account" className="surface flex flex-col gap-3 p-4">
      <h2 id="settings-account" className="text-sm font-bold">
        계정
      </h2>
      {/* 세션 확인 중엔 비어 있는 data로 로그인 버튼이 잠깐 비치지 않게 자리만 잡는다 */}
      {isPending ? (
        <p className="text-sm text-dim">확인 중…</p>
      ) : data ? (
        <LinkedAccounts userId={data.user.id} name={data.user.name} />
      ) : (
        <LoginPanel />
      )}
    </section>
  )
}

function LinkedAccounts({ userId, name }: { userId: string; name: string }) {
  const error = useLocation({ select: (l) => new URLSearchParams(l.searchStr).get('error') })
  const { data: accounts } = useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => (await authClient.listAccounts()).data ?? [],
  })
  const linked = new Set(accounts?.map((a) => a.providerId))
  const providers = Object.keys(PROVIDER_NAMES) as Provider[]
  return (
    <>
      <p className="text-sm">
        {name || '이름 없음'}
        {accounts && ` · ${providers.filter((p) => linked.has(p)).map((p) => PROVIDER_NAMES[p]).join('·')} 연결됨`}
      </p>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          연결하지 못했어요. 이미 다른 계정에서 쓰는 로그인일 수 있어요.
        </p>
      )}
      {accounts &&
        providers
          .filter((p) => !linked.has(p))
          .map((provider) => (
            <button
              key={provider}
              type="button"
              className="press min-h-11 rounded-full border border-edge px-4 text-sm font-bold"
              onClick={() => authClient.linkSocial({ provider, callbackURL: '/settings', errorCallbackURL: '/settings' })}
            >
              {PROVIDER_NAMES[provider]}도 연결하기
            </button>
          ))}
    </>
  )
}
