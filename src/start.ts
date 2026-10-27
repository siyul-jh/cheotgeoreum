import { createStart } from '@tanstack/react-start'

// localStorage(zustand persist) 화면의 hydration 불일치를 없애려고 전역 SSR을 끈다(Spike 2).
export const startInstance = createStart(() => ({ defaultSsr: false }))
