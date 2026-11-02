import { createServerFn } from '@tanstack/react-start'
import { SyncChunkSchema } from './sync-schema'

// 서버 전용 모듈은 handler 안에서만 동적 import한다
export const syncDreams = createServerFn({ method: 'POST' })
  .validator(SyncChunkSchema)
  .handler(async ({ data }) => {
    const [{ requireUserId }, { runSync }] = await Promise.all([import('@/shared/api/auth.server'), import('./sync-dreams.server')])
    return runSync(await requireUserId(), data)
  })
