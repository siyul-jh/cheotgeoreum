import type { ButtonHTMLAttributes } from 'react'

export type Provider = 'google' | 'kakao'

// 공식 로그인 버튼 규격을 따른다(2026-11 확인)
// - 구글: developers.google.com/identity/branding-guidelines — 흰 바탕 #FFFFFF·테두리 #747775 1px·글자 #1F1F1F, 14/20 Medium,
//   표준 4색 G, 여백 G 왼쪽 12px·G 오른쪽 10px·글자 오른쪽 12px. 문구는 앱 언어로 옮겨도 된다
// - 카카오: developers.kakao.com/docs/ko/kakaologin/design-guide — 바탕 #FEE500·말풍선 #000000·글자 #000000 85%, 모서리 12px,
//   문구는 '카카오 로그인'(완성형)만. 말풍선은 공식 리소스(login-complete-ko.svg)의 경로 그대로
// 두 버튼은 같은 크기·모서리로 둔다(구글: 다른 로그인과 같은 비중 이상)
// ponytail: 구글 권장 글꼴 Google Sans는 싣지 않고 앱 글꼴 Medium으로 쓴다. 규격 검수에서 문제 되면 글꼴 추가
export const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google 계정으로 계속하기',
  kakao: '카카오 로그인',
}

const STYLES: Record<Provider, string> = {
  google: 'border border-[#747775] bg-white pl-3 pr-3 text-[#1F1F1F]',
  kakao: 'bg-[#FEE500] px-3 text-black/85',
}

function GoogleG() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="mr-2.5 size-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function KakaoSymbol() {
  return (
    <svg aria-hidden="true" viewBox="61.5 16.5 13 13" className="mr-2 size-[18px] shrink-0">
      <path
        fill="#000000"
        d="M68.001 16.5225C64.4222 16.5225 61.5225 19.0037 61.5225 22.0641C61.5225 24.0312 62.7219 25.7596 64.5292 26.7423L63.9181 29.2113C63.8954 29.285 63.9132 29.364 63.9619 29.4184C63.9975 29.457 64.0461 29.478 64.0931 29.478C64.1337 29.478 64.1742 29.464 64.2082 29.4341L66.834 27.5144C67.2117 27.5723 67.6007 27.6039 67.9994 27.6039C71.5767 27.6039 74.478 25.1226 74.478 22.0623C74.478 19.002 71.5783 16.5225 68.001 16.5225Z"
      />
    </svg>
  )
}

type Props = { provider: Provider; label?: string } & ButtonHTMLAttributes<HTMLButtonElement>

export function SocialLoginButton({ provider, label = PROVIDER_LABELS[provider], className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      className={`press flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-medium leading-5 ${STYLES[provider]} ${className}`}
      {...rest}
    >
      {provider === 'google' ? <GoogleG /> : <KakaoSymbol />}
      {label}
    </button>
  )
}
