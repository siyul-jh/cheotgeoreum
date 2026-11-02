import { createFileRoute } from '@tanstack/react-router'

// /api/auth/* 는 모두 Better Auth가 처리한다. 서버 전용 모듈은 handler 안에서만 동적 import한다
async function handle({ request }: { request: Request }) {
  const { getAuth } = await import('@/shared/api/auth.server')
  return getAuth().handler(request)
}

export const Route = createFileRoute('/api/auth/$')({ server: { handlers: { GET: handle, POST: handle } } })
