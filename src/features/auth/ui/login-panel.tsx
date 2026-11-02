import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/shared/api/auth-client'
import { SocialLoginButton, type Provider } from './social-login-button'

const PROVIDERS: Provider[] = ['google', 'kakao']

export function LoginPanel() {
  // 로그인에 실패하면 Better Auth가 errorCallbackURL에 ?error=코드를 붙여 돌려보낸다
  const error = useLocation({ select: (l) => new URLSearchParams(l.searchStr).get('error') })
  // 눌렀는데 이 창이 그대로면 로그인 화면이 다른 창(앱 밖 브라우저)에서 열린 것이다
  const [started, setStarted] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-mute">
        로그인은 선택이에요. 연결하면 다른 기기에서도 같은 꿈을 볼 수 있어요. 로그인한 뒤 다른 쪽도 연결하면 구글·카카오
        어느 쪽으로 들어와도 같은 계정이에요.
      </p>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
      {PROVIDERS.map((provider) => (
        <SocialLoginButton
          key={provider}
          provider={provider}
          onClick={() => {
            setStarted(true)
            void authClient.signIn.social({ provider, callbackURL: '/settings', errorCallbackURL: '/settings' })
          }}
        />
      ))}
      {started && (
        <p role="status" className="text-[13px] text-mute">
          로그인 창이 따로 열렸다면 로그인을 마친 뒤 이 창으로 돌아오세요. 자동으로 반영돼요.
        </p>
      )}
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
