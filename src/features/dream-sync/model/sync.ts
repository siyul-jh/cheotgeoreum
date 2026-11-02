import { create } from 'zustand'
import { latestIn, mergeItems, useBucketStore, type SyncSnapshot } from '@/entities/bucket-item'
import { SYNC_CHUNK_BYTES, SYNC_CHUNK_COUNT } from '@/shared/config/limits'
import { chunkByBytes } from '@/shared/lib/chunk-by-bytes'
import type { SyncChunk, SyncResult } from '../api/sync-schema'

// mismatch: 서버의 세션 사용자가 이 기기 꿈의 주인이 아니다(다른 창에서 계정을 바꿈). 다시 해도 같아 세션부터 다시 읽는다
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'held' | 'mismatch'
export type Send = (chunk: SyncChunk) => Promise<SyncResult>

// 서버 상태를 적용하면 이 기기의 꿈이 크게 줄어들 때 적용을 멈추고 사용자에게 묻는다
type Held = { snapshot: SyncSnapshot; acked: string[]; key: string }

// rejected: 서버가 받지 않은 꿈 수(형식이 틀리거나 상한 초과). 이 기기에만 남는다
export const useSyncStatus = create<{ status: SyncStatus; held: Held | null; lastAt: number; rejected: number }>(() => ({
  status: 'idle',
  held: null,
  lastAt: 0,
  rejected: 0,
}))

// [그래도 적용]한 사라짐 묶음. 같은 묶음으로는 다시 묻지 않는다
let forgivenKey = ''

// 한 번 동기화: 이 기기 전체(꿈 → 지운 흔적 순, 1MB 조각)를 올리고, 마지막 조각 응답으로 계정 전체 상태를 받아 합친다
export async function syncOnce(send: Send): Promise<void> {
  const local = useBucketStore.getState()
  const ownerId = local.ownerId
  if (ownerId === null) throw new Error('주인 없는 꿈은 올리지 않는다')
  const sentIds = local.items.map((i) => i.id)
  // 지운 흔적 먼저: 같은 동기화에서 지운 만큼 상한에 여유가 생기게
  const pieces: Pick<SyncChunk, 'items' | 'deleted'>[] = [
    ...chunkByBytes(local.deletedIds, SYNC_CHUNK_BYTES, SYNC_CHUNK_COUNT).map((deleted) => ({ items: [], deleted })),
    ...chunkByBytes(local.items, SYNC_CHUNK_BYTES, SYNC_CHUNK_COUNT).map((items) => ({ items, deleted: [] })),
  ]
  if (pieces.length === 0) pieces.push({ items: [], deleted: [] })

  const acked: string[] = []
  const rejected = new Set<string>()
  let snapshot: SyncSnapshot | null = null
  let cursor: string | null = null
  for (const [i, piece] of pieces.entries()) {
    const final = i === pieces.length - 1
    const result = await send({ ...piece, categories: final ? local.categoryLog : [], final, cursor: null, ownerId })
    acked.push(...result.ackedDeleted)
    for (const r of result.rejected) rejected.add(r.id)
    if (result.snapshot) {
      const { nextCursor, ...rest } = result.snapshot
      snapshot = rest
      cursor = nextCursor
    }
  }
  // 상태가 1MB를 넘으면 나머지 페이지를 이어 받는다
  while (snapshot && cursor) {
    const { snapshot: page } = await send({ items: [], deleted: [], categories: [], final: true, cursor, ownerId })
    if (!page) break
    snapshot = { ...snapshot, items: [...snapshot.items, ...page.items], deleted: [...snapshot.deleted, ...page.deleted] }
    cursor = page.nextCursor
  }
  if (!snapshot) throw new Error('동기화 응답에 상태가 없다')

  // 축소 가드(모든 조각과 페이지를 받은 뒤 한 번): ① 올린 꿈이 서버에 흔적도 없이 없거나 ② 적용하면 절반 이상 사라지면 멈춘다
  const onServer = new Set([...snapshot.items.map((i) => i.id), ...snapshot.deleted.map((d) => d.id)])
  const vanished = sentIds.filter((id) => !rejected.has(id) && !onServer.has(id))
  const now = useBucketStore.getState()
  const kept = new Set(mergeItems({ items: now.items, deleted: now.deletedIds }, snapshot).items.map((i) => i.id))
  const lost = now.items.filter((i) => !kept.has(i.id)).map((i) => i.id)
  const key = [...vanished, ...lost].sort().join()
  const shrinking = vanished.length > 0 || (now.items.length >= 4 && lost.length * 2 >= now.items.length)
  if (shrinking && key !== forgivenKey) {
    console.error('[sync] shrink', { vanished: vanished.length, lost: lost.length, local: now.items.length })
    useSyncStatus.setState({ status: 'held', held: { snapshot, acked, key } })
    return
  }
  now.applySynced(snapshot, acked)
  useSyncStatus.setState({ status: 'idle', held: null, lastAt: Date.now(), rejected: rejected.size })
}

// 동시에 하나만 돈다. 도는 중에 또 부르면 끝난 뒤 한 번 더
let running: Promise<boolean> | null = null
let again = false
export function requestSync(send: Send): Promise<boolean> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    let ok = false
    do {
      again = false
      if (!navigator.onLine) {
        useSyncStatus.setState({ status: 'offline' })
        return false
      }
      if (useSyncStatus.getState().status !== 'held') useSyncStatus.setState({ status: 'syncing' })
      try {
        await syncOnce(send)
        ok = useSyncStatus.getState().status !== 'held'
      } catch (error) {
        console.error('[sync] failed', error)
        const mismatch = error instanceof Error && error.message.includes('OWNER_MISMATCH')
        useSyncStatus.setState({ status: mismatch ? 'mismatch' : 'error' })
        ok = false
      }
    } while (again)
    return ok
  })().finally(() => {
    running = null
  })
  return running
}

// 멈춘 동기화 풀기
export function applyHeld() {
  const { held } = useSyncStatus.getState()
  if (!held) return
  forgivenKey = held.key
  useBucketStore.getState().applySynced(held.snapshot, held.acked)
  useSyncStatus.setState({ status: 'idle', held: null, lastAt: Date.now() })
}

export function reuploadLocal(send: Send) {
  // 기기 시계가 늦어도 서버의 지운 흔적보다 새로워지게
  const { held } = useSyncStatus.getState()
  useBucketStore.getState().touchAll(held ? latestIn(held.snapshot) : undefined)
  useSyncStatus.setState({ status: 'idle', held: null })
  return requestSync(send)
}
