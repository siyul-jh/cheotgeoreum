import type { ReactNode } from 'react'

// 화면 아래에 떠 있는 상태 알약(아이디어 추천·빈 칸 채우기). live region은 늘 두고 내용만 바꾼다
// (새로 생긴 region은 읽지 않는 스크린 리더가 있다). className으로 아래 여백을 바꾼다(고정 바가 있는 화면)
export function FloatingStatus({ show, children, className = 'bottom-4' }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <div role="status" className={`pointer-events-none fixed inset-x-4 z-20 mx-auto flex max-w-md justify-center ${className}`}>
      {show && (
        <div className="surface pointer-events-auto flex min-h-12 items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 text-sm shadow-lg">
          {children}
        </div>
      )}
    </div>
  )
}

// 모션 축소면 돌지 않는다(글자로 상태를 알린다)
export function Spinner() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-gold motion-safe:animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
