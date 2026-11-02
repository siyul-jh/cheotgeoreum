import { useEffect, useState } from 'react'

// 이만큼(px) 당긴 채 놓으면 새로고침. 손가락 이동의 절반만 따라 내려온다
export const PULL_THRESHOLD = 64
const MAX_PULL = 96
// 입력 칸·시트 안에서 끄는 손짓은 그쪽 스크롤·선택에 양보한다
const IGNORE = 'input, textarea, select, dialog, [role="dialog"]'

// 설치 앱(standalone)엔 브라우저의 당겨서 새로고침이 없어 직접 단다.
// ponytail: 새로고침 = 페이지 다시 불러오기(새 배포·서비스 워커 갱신 반영). 데이터별 refetch는 서버 동기화가 생기면
export function PullToRefresh({ enabled }: { enabled: boolean }) {
  const [pull, setPull] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let startY = -1
    let distance = 0
    const onStart = (e: TouchEvent) => {
      const target = e.target instanceof Element ? e.target : null
      startY = scrollY <= 0 && e.touches.length === 1 && !target?.closest(IGNORE) ? e.touches[0].clientY : -1
      distance = 0
    }
    const onMove = (e: TouchEvent) => {
      if (startY < 0) return
      distance = Math.min(Math.max(0, (e.touches[0].clientY - startY) / 2), MAX_PULL)
      setPull(distance)
    }
    const onEnd = () => {
      if (startY >= 0 && distance >= PULL_THRESHOLD) location.reload()
      startY = -1
      distance = 0
      setPull(0)
    }
    addEventListener('touchstart', onStart, { passive: true })
    addEventListener('touchmove', onMove, { passive: true })
    addEventListener('touchend', onEnd)
    addEventListener('touchcancel', onEnd)
    return () => {
      removeEventListener('touchstart', onStart)
      removeEventListener('touchmove', onMove)
      removeEventListener('touchend', onEnd)
      removeEventListener('touchcancel', onEnd)
    }
  }, [enabled])
  if (pull === 0) return null
  const ready = pull >= PULL_THRESHOLD
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center pt-[env(safe-area-inset-top)]"
      style={{ transform: `translateY(${pull - 40}px)` }}
    >
      <div className="surface flex size-10 items-center justify-center rounded-full shadow-lg">
        <svg
          viewBox="0 0 24 24"
          className={`size-5 transition-transform ${ready ? 'rotate-180 text-gold' : 'text-ink'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </div>
  )
}
