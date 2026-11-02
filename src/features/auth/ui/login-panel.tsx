import { Link, useLocation } from '@tanstack/react-router'
import { authClient } from '@/shared/api/auth-client'

const PROVIDERS = [
  ['google', '구글로 계속하기'],
  ['kakao', '카카오로 계속하기'],
] as const

export function LoginPanel() {
  // 로그인에 실패하면 Better Auth가 errorCallbackURL에 ?error=코드를 붙여 돌려보낸다
  const error = useLocation({ select: (l) => new URLSearchParams(l.searchStr).get('error') })
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-mute">
        로그인은 선택이에요. 연결하면 다른 기기에서도 같은 꿈을 볼 수 있어요. 구글과 카카오는 별개 계정이라, 늘 같은 쪽으로
        로그인하세요.
      </p>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
      {PROVIDERS.map(([provider, label]) => (
        <button
          key={provider}
          type="button"
          className="press min-h-11 rounded-full border border-edge px-4 text-sm font-bold"
          onClick={() => authClient.signIn.social({ provider, callbackURL: '/settings', errorCallbackURL: '/settings' })}
        >
          {label}
        </button>
      ))}
      <p className="text-[13px] text-mute">
        계속하면{' '}
        <Link to="/terms" className="underline">
          이용약관
        </Link>
        과{' '}
        <Link to="/privacy" className="underline">
          개인정보처리방침
        </Link>
        에 동의하는 것으로 봐요.
      </p>
    </div>
  )
}
