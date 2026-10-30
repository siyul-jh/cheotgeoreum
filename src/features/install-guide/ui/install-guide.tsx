import { useEffect, useState } from 'react'
import { StarIcon } from '@/shared/ui/star-icon'

// 설치해 연 앱인가. 브라우저 탭(display-mode: browser)만 아니면 앱 창으로 본다(standalone 말고 minimal-ui·
// window-controls-overlay 등으로 여는 브라우저가 있다, 예: Whale 앱). iOS Safari 홈 화면 앱은 navigator.standalone
export const isStandalone = () =>
  !matchMedia('(display-mode: browser)').matches || ('standalone' in navigator && navigator.standalone === true)

// 크롬 계열이 설치 가능할 때 주는 이벤트(표준 타입에 없다)
type InstallPromptEvent = Event & { prompt: () => Promise<void> }

const IN_APP = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i

// 설치 버튼(beforeinstallprompt)을 못 받는 브라우저별 단계 안내. 메뉴 이름은 각 브라우저 화면에 보이는 그대로
export function installSteps(ua: string, touch: boolean): string[] {
  // 아이패드는 데스크톱 Safari처럼 Macintosh로 알려 온다. 터치로 구별한다
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch)
  if (ios && /CriOS/.test(ua)) return ['주소창 오른쪽 공유 버튼(□↑)을 눌러요', "'홈 화면에 추가'를 눌러요", '홈 화면의 첫걸음 아이콘으로 열어요']
  if (ios) return ['Safari 아래쪽(아이패드는 위쪽) 공유 버튼(□↑)을 눌러요', "'홈 화면에 추가'를 눌러요", '홈 화면의 첫걸음 아이콘으로 열어요']
  if (/SamsungBrowser/.test(ua)) return ['아래쪽 메뉴(≡)를 눌러요', "'현재 페이지 추가' → '홈 화면'을 눌러요", '홈 화면의 첫걸음 아이콘으로 열어요']
  if (/Firefox/.test(ua)) return ['Firefox는 앱 설치를 지원하지 않아요', '크롬·엣지·웨일(PC) 또는 Safari(Mac)로 이 주소를 열어 주세요']
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Whale/.test(ua))
    return ["화면 맨 위 메뉴 막대에서 '파일'을 눌러요", "'Dock에 추가'를 누르고 '추가'를 눌러요", 'Dock의 첫걸음 아이콘으로 열어요']
  // 크롬 계열인데 설치 버튼이 없으면 대개 이미 설치한 경우
  return [
    '이미 설치했다면 앱 목록(Launchpad·시작 메뉴·홈 화면)에서 첫걸음을 열어요',
    "처음이라면 주소창 오른쪽 설치 아이콘(⊕)이나 브라우저 메뉴(⋮)의 '앱 설치'·'홈 화면에 추가'를 눌러요",
  ]
}

// 브라우저로 열면 앱 대신 보이는 설치 안내. 설치한 앱으로 열어야 쓸 수 있다
export function InstallGuide() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
    }
    addEventListener('beforeinstallprompt', onPrompt)
    return () => removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const ua = navigator.userAgent
  const kakao = /KAKAOTALK/i.test(ua)
  return (
    <section className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center gap-5 text-center">
      <StarIcon fill="currentColor" className="glow size-14 text-gold" />
      <h1 className="font-title text-[28px] font-bold leading-snug">첫걸음은 앱으로 설치해 써요</h1>
      {IN_APP.test(ua) ? (
        <>
          <p className="text-mute">이 화면(앱 안 브라우저)에서는 설치할 수 없어요. 기본 브라우저로 열어 설치해 주세요.</p>
          {kakao && (
            <a
              href={`kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}`}
              className="btn btn-primary press flex w-full items-center justify-center"
            >
              기본 브라우저로 열기
            </a>
          )}
          <p className="text-sm text-mute">안 열리면 오른쪽 위·아래 메뉴(⋯)에서 '다른 브라우저로 열기'를 눌러 주세요.</p>
        </>
      ) : prompt ? (
        <button type="button" className="btn btn-primary press w-full" onClick={() => void prompt.prompt()}>
          앱 설치
        </button>
      ) : (
        <ol className="flex w-full flex-col gap-2 text-left">
          {installSteps(ua, navigator.maxTouchPoints > 0).map((step, i) => (
            <li key={step} className="surface flex items-center gap-3 rounded-[14px] px-3.5 py-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-on-gold">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
