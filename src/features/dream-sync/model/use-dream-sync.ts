import { useEffect } from 'react'
import { syncFlags, useBucketStore } from '@/entities/bucket-item'
import { authClient } from '@/shared/api/auth-client'
import { syncDreams } from '../api/sync-dreams'
import { requestSync, useSyncStatus, type Send } from './sync'

const DEBOUNCE_MS = 2_000
const STALE_MS = 60_000

export const sendChunk: Send = (chunk) => syncDreams({ data: chunk })

// 로그인한 계정이 이 기기 꿈의 주인일 때만 동기화한다(다른 계정 꿈을 올리지 않는다).
// 언제: 켤 때, 다시 보일 때(1분 넘게 지났으면), 온라인이 될 때, 고친 뒤 2초 조용하면
export function useDreamSync(send: Send = sendChunk) {
  const { data: session } = authClient.useSession()
  const ownerId = useBucketStore((s) => s.ownerId)
  const active = session !== null && session !== undefined && session.user.id === ownerId

  useEffect(() => {
    if (!active) return
    let timer = 0
    const run = () => void requestSync(send)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - useSyncStatus.getState().lastAt > STALE_MS) run()
    }
    const unsubscribe = useBucketStore.subscribe((state, prev) => {
      // 동기화 결과를 적용한 변경은 다시 올리지 않는다
      if (syncFlags.applying) return
      if (state.items === prev.items && state.deletedIds === prev.deletedIds && state.categoryLog === prev.categoryLog) return
      clearTimeout(timer)
      timer = window.setTimeout(run, DEBOUNCE_MS)
    })
    run()
    addEventListener('online', run)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      unsubscribe()
      removeEventListener('online', run)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active, send])

  // 주인 불일치로 거절되면 세션을 다시 읽는다 → active가 풀리고 설정에 다른 계정 안내가 뜬다
  const mismatch = useSyncStatus((s) => s.status === 'mismatch')
  useEffect(() => {
    if (mismatch) authClient.$store.notify('$sessionSignal')
  }, [mismatch])
}
