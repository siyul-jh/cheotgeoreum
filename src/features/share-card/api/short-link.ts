import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { decodeCard } from '../lib/share-link'

// 짧은 링크 id: 카드 내용 해시 앞 10글자(base64url)
export const SHORT_ID = /^[A-Za-z0-9_-]{10}$/

// 서버 전용 모듈은 handler 안에서만 동적 import한다(Spike 8: client 번들에서 제거됨)
export const saveShortLink = createServerFn({ method: 'POST' })
  .validator(z.object({ payload: z.string().max(60_002) }))
  .handler(async ({ data }) => {
    const { saveCard } = await import('./short-link.server')
    return saveCard(data.payload)
  })

export const loadShortLink = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().regex(SHORT_ID) }))
  .handler(async ({ data }) => {
    const { loadCard } = await import('./short-link.server')
    return loadCard(data.id)
  })

// 받은 링크의 # 뒤: 짧은 id면 서버에서 내용을 받아오고, 아니면(예전 긴 링크) 바로 해독한다
export async function openSharedCard(hash: string) {
  if (!SHORT_ID.test(hash)) return decodeCard(hash)
  const payload = await loadShortLink({ data: { id: hash } })
  if (!payload) throw new Error('없거나 만료된 짧은 링크')
  return decodeCard(payload)
}
