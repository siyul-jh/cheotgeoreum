import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

// localStorage(zustand persist) 화면의 hydration 불일치를 없애려고 전역 SSR을 끈다(Spike 2).
// startInstance가 있으면 Start 기본 CSRF 검사가 빠지므로 서버 함수에 직접 건다(Spike 8: 다른 origin이 LLM 크레딧을 쓰지 못하게).
export const startInstance = createStart(() => ({
  defaultSsr: false,
  requestMiddleware: [createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })],
}))
