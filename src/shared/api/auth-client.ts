import { createAuthClient } from 'better-auth/react'

// baseURL을 비우면 현재 origin의 /api/auth를 쓴다
export const authClient = createAuthClient()

// Better Auth는 탭이 다시 보일 때(visibilitychange)만 세션을 다시 읽는다. 데스크톱 앱 창은 다른 창에서 돌아와도
// 보임 상태가 그대로라 이벤트가 없다 → 창 포커스에도 다시 읽는다(예: Whale 앱이 로그인을 브라우저 창에서 끝낸 뒤)
const FOCUS_REFETCH_MS = 5_000
let lastFocusRefetch = 0
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    if (Date.now() - lastFocusRefetch < FOCUS_REFETCH_MS) return
    lastFocusRefetch = Date.now()
    authClient.$store.notify('$sessionSignal')
  })
}
