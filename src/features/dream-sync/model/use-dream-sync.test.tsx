import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore, type BucketItemInput } from '@/entities/bucket-item'
import type { SyncResult } from '../api/sync-schema'
import { useSyncStatus, type Send } from './sync'
import { useDreamSync } from './use-dream-sync'

const auth = vi.hoisted(() => ({ session: null as { user: { id: string } } | null, notify: vi.fn() }))
vi.mock('@/shared/api/auth-client', () => ({
  authClient: { useSession: () => ({ data: auth.session }), $store: { notify: auth.notify } },
}))
vi.mock('../api/sync-dreams', () => ({ syncDreams: vi.fn() }))

const input: BucketItemInput = {
  title: '꿈', why: '', category: null, targetPeriod: null, prerequisites: [], nextAction: { text: '', dueDate: null },
  status: '아이디어', companions: [],
}
const empty: SyncResult = {
  ackedDeleted: [],
  rejected: [],
  snapshot: { items: [], deleted: [], categories: [], nextCursor: null, serverNow: new Date().toISOString() },
}

let send: ReturnType<typeof vi.fn<Send>>
beforeEach(() => {
  vi.useFakeTimers()
  useBucketStore.setState({ items: [], customCategories: [], categoryLog: [], deletedIds: [], ownerId: 'u1' })
  useSyncStatus.setState({ status: 'idle', held: null, lastAt: 0, rejected: 0 })
  // 서버는 받은 꿈을 그대로 돌려준다(이 기기 상태 = 서버 상태)
  send = vi.fn<Send>(async (chunk) => ({ ...empty, snapshot: { ...empty.snapshot!, items: chunk.items as never } }))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  auth.session = null
})

const flush = () => act(async () => {
  await vi.advanceTimersByTimeAsync(0)
})

test('로그인한 계정이 이 기기 꿈의 주인이 아니면(또는 로그인 전) 한 번도 부르지 않는다', async () => {
  renderHook(() => useDreamSync(send))
  auth.session = { user: { id: 'u2' } }
  renderHook(() => useDreamSync(send))
  useBucketStore.getState().addItem(input)
  await act(() => vi.advanceTimersByTimeAsync(5_000))
  expect(send).not.toHaveBeenCalled()
})

test('주인이면 켤 때 1번, 동기화 결과 적용으로는 더 부르지 않고, 사용자가 고치면 2초 뒤 1번 더', async () => {
  auth.session = { user: { id: 'u1' } }
  renderHook(() => useDreamSync(send))
  await flush()
  expect(send).toHaveBeenCalledTimes(1)
  await act(() => vi.advanceTimersByTimeAsync(5_000))
  expect(send).toHaveBeenCalledTimes(1)

  useBucketStore.getState().addItem(input)
  await act(() => vi.advanceTimersByTimeAsync(1_000))
  useBucketStore.getState().addItem(input) // 연달아 고치면 한 번으로 모은다
  await act(() => vi.advanceTimersByTimeAsync(2_000))
  expect(send).toHaveBeenCalledTimes(2)
  await act(() => vi.advanceTimersByTimeAsync(5_000))
  expect(send).toHaveBeenCalledTimes(2)
})

test('오프라인이면 부르지 않고 offline, 온라인이 되면 다시 부른다', async () => {
  auth.session = { user: { id: 'u1' } }
  const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  renderHook(() => useDreamSync(send))
  await flush()
  expect(send).not.toHaveBeenCalled()
  expect(useSyncStatus.getState().status).toBe('offline')
  onLine.mockReturnValue(true)
  await act(async () => {
    dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
  })
  expect(send).toHaveBeenCalledTimes(1)
  expect(useSyncStatus.getState().status).toBe('idle')
})

test('서버가 주인 불일치로 거절하면 mismatch로 두고 세션을 다시 읽는다', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  auth.session = { user: { id: 'u1' } }
  send.mockRejectedValue(new Error('OWNER_MISMATCH'))
  renderHook(() => useDreamSync(send))
  await flush()
  expect(useSyncStatus.getState().status).toBe('mismatch')
  expect(auth.notify).toHaveBeenCalledWith('$sessionSignal')
})
