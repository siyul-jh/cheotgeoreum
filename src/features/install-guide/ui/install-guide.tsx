import { useEffect, useState } from 'react'
import { StarIcon } from '@/shared/ui/star-icon'

// 설치해 연 앱인가. 브라우저 탭(display-mode: browser)만 아니면 앱 창으로 본다(standalone 말고 minimal-ui·
// window-controls-overlay 등으로 여는 브라우저가 있다, 예: Whale 앱). iOS Safari 홈 화면 앱은 navigator.standalone
export const isStandalone = () =>
  !matchMedia('(display-mode: browser)').matches || ('standalone' in navigator && navigator.standalone === true)

// 크롬 계열이 설치 가능할 때 주는 이벤트(표준 타입에 없다)
type InstallPromptEvent = Event & { prompt: () => Promise<void> }

const IN_APP = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i
const IOS = /iPhone|iPad|iPod/

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
      ) : IOS.test(ua) ? (
        <ol className="flex flex-col gap-2 text-left text-mute">
          <li>1. Safari 아래쪽의 공유 버튼(□↑)을 눌러요</li>
          <li>2. '홈 화면에 추가'를 눌러요</li>
          <li>3. 홈 화면의 첫걸음 아이콘으로 열어요</li>
        </ol>
      ) : (
        <p className="text-mute">브라우저 메뉴에서 '앱 설치' 또는 '홈 화면에 추가'를 눌러, 설치된 첫걸음으로 열어 주세요.</p>
      )}
    </section>
  )
}
