import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/shared/api/auth-client'
import { deleteAccountFn } from '../api/delete-account'
import { LoginPanel } from './login-panel'

const PROVIDER_NAMES = { google: '구글', kakao: '카카오' } as const
type Provider = keyof typeof PROVIDER_NAMES

export function AccountSection() {
  const { data, isPending, refetch } = authClient.useSession()
  return (
    <section aria-labelledby="settings-account" className="surface flex flex-col gap-3 p-4">
      <h2 id="settings-account" className="text-sm font-bold">
        계정
      </h2>
      {/* 세션 확인 중엔 비어 있는 data로 로그인 버튼이 잠깐 비치지 않게 자리만 잡는다 */}
      {isPending ? (
        <p className="text-sm text-dim">확인 중…</p>
      ) : data ? (
        <LinkedAccounts userId={data.user.id} name={data.user.name} onDeleted={() => void refetch()} />
      ) : (
        <LoginPanel />
      )}
    </section>
  )
}

function LinkedAccounts({ userId, name, onDeleted }: { userId: string; name: string; onDeleted: () => void }) {
  const error = useLocation({ select: (l) => new URLSearchParams(l.searchStr).get('error') })
  const { data: accounts } = useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => (await authClient.listAccounts()).data ?? [],
  })
  const linked = new Set(accounts?.map((a) => a.providerId))
  const providers = Object.keys(PROVIDER_NAMES) as Provider[]
  const [deleteState, setDeleteState] = useState<'idle' | 'pending' | 'reauth' | 'error'>('idle')

  const remove = async () => {
    if (!window.confirm('계정을 삭제할까요? 서버의 계정 정보가 지워지고 되돌릴 수 없어요. 이 기기의 꿈은 그대로 남아요.')) return
    setDeleteState('pending')
    try {
      const result = await deleteAccountFn()
      if ('code' in result) return setDeleteState('reauth')
      onDeleted()
    } catch {
      setDeleteState('error')
    }
  }
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
      {/* 로그아웃해도 이 기기의 꿈은 남는다 */}
      <div className="flex gap-2 border-t border-line pt-3">
        <button type="button" className="btn press flex-1 text-sm" onClick={() => void authClient.signOut()}>
          로그아웃
        </button>
        <button
          type="button"
          className="btn press flex-1 text-sm text-danger"
          disabled={deleteState === 'pending'}
          onClick={() => void remove()}
        >
          {deleteState === 'pending' ? '삭제하는 중…' : '계정 삭제'}
        </button>
      </div>
      {deleteState === 'reauth' && (
        <div role="alert" className="flex flex-col gap-2 text-[13px]">
          <p>안전을 위해 로그인한 지 하루가 지나면 다시 로그인한 뒤 삭제할 수 있어요.</p>
          {providers
            .filter((p) => linked.has(p))
            .map((provider) => (
              <button
                key={provider}
                type="button"
                className="btn press text-sm"
                onClick={() => authClient.signIn.social({ provider, callbackURL: '/settings', errorCallbackURL: '/settings' })}
              >
                {PROVIDER_NAMES[provider]}로 다시 로그인
              </button>
            ))}
        </div>
      )}
      {deleteState === 'error' && (
        <p role="alert" className="text-[13px] text-danger">
          계정을 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
    </>
  )
}
