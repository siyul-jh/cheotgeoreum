import { createAuthClient } from 'better-auth/react'

// baseURL을 비우면 현재 origin의 /api/auth를 쓴다
export const authClient = createAuthClient()
