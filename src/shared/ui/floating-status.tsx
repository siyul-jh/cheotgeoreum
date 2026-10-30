import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

// 화면 아래 떠 있는 상태 알약들이 겹치지 않게 쌓이는 자리. __root가 하나 둔다.
// 아래 고정 저장 바([data-save-bar])가 있는 화면에선 그 위로 올라간다
export const FLOATING_STACK_ID = 'floating-status'

// 화면 아래에 떠 있는 상태 알약(아이디어 추천·빈 칸 채우기). live region은 늘 두고 내용만 바꾼다
// (새로 생긴 region은 읽지 않는 스크린 리더가 있다)
export function FloatingStatus({ show, children }: { show: boolean; children: ReactNode }) {
  const region = (
    <div role="status" className="flex justify-center">
      {show && (
        <div className="surface pointer-events-auto flex min-h-12 items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 text-sm shadow-lg">
          {children}
        </div>
      )}
    </div>
  )
  // ponytail: 처음 그릴 때는 스택이 아직 DOM에 없어 제자리에 둔다(알약은 상태가 바뀐 뒤 다시 그릴 때 뜬다)
  const stack = document.getElementById(FLOATING_STACK_ID)
  return stack ? createPortal(region, stack) : region
}

// 모션 축소 설정이어도 돈다(사용자 결정: 멈춰 있으면 진행 중인지 알 수 없다). 작은 회전이라 화면 전체 움직임보다 부담이 적다
export function Spinner() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 animate-spin text-gold" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
