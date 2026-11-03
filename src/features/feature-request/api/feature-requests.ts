import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const REQUEST_LIMITS = { title: 80, body: 2000 } as const

export const FeatureRequestSchema = z.object({
  title: z.string().trim().min(1).max(REQUEST_LIMITS.title),
  body: z.string().trim().min(1).max(REQUEST_LIMITS.body),
})
export type FeatureRequest = z.infer<typeof FeatureRequestSchema>
export type SendResult = { ok: true; url: string } | { ok: false; code: 'rate' | 'error' }
// open: 검토 중, done: 만들었음, closed: 하지 않기로 함
export type RequestStatus = 'open' | 'done' | 'closed'
export type RequestSummary = {
  number: number
  title: string
  body: string
  status: RequestStatus
  url: string
  createdAt: string
  comments: number
}

// 서버 전용 모듈은 handler 안에서만 동적 import한다(Spike 8: client 번들에서 제거됨)
export const sendFeatureRequest = createServerFn({ method: 'POST' })
  .validator(FeatureRequestSchema)
  .handler(async ({ data }) => {
    const [{ createIssue }, { getRequestIP }] = await Promise.all([
      import('./feature-requests.server'),
      import('@tanstack/react-start/server'),
    ])
    // Vercel은 x-forwarded-for 첫 값을 실제 접속 IP로 덮어쓴다(클라이언트가 위조할 수 없다)
    return createIssue(data, getRequestIP({ xForwardedFor: true }))
  })

export const listFeatureRequests = createServerFn({ method: 'POST' }).handler(async () => {
  const { listRequests } = await import('./feature-requests.server')
  return listRequests()
})
