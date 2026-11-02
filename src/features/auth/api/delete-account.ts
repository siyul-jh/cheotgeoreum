import { createServerFn } from '@tanstack/react-start'

// 서버 전용 모듈은 handler 안에서만 동적 import한다
export const deleteAccountFn = createServerFn({ method: 'POST' }).handler(async () => {
  const [{ requireUserId }, { deleteAccount }] = await Promise.all([
    import('@/shared/api/auth.server'),
    import('./delete-account.server'),
  ])
  return deleteAccount(await requireUserId())
})
