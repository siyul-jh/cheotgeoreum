import { useEffect, useState } from 'react'
import { downloadBackup, mergeItems, useBucketStore } from '@/entities/bucket-item'
import { applyHeld, requestSync, reuploadLocal, useSyncStatus } from '../model/sync'
import { sendChunk } from '../model/use-dream-sync'

const STATUS_TEXT = {
  idle: '다른 기기와 꿈을 맞춰 두고 있어요.',
  syncing: '맞추는 중…',
  offline: '오프라인이에요. 연결되면 맞춰요.',
  error: '맞추지 못했어요.',
  mismatch: '다른 창에서 계정이 바뀌었어요. 확인하는 중…',
} as const

// 설정 > 계정 아래: 이 기기 꿈과 로그인한 계정을 잇는다
export function SyncPanel({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const ownerId = useBucketStore((s) => s.ownerId)
  const count = useBucketStore((s) => s.items.length)
  const claim = useBucketStore((s) => s.claimLocalData)
  const [later, setLater] = useState(false)

  const deletedCount = useBucketStore((s) => s.deletedIds.length)
  const logCount = useBucketStore((s) => s.categoryLog.length)
  const [backedUp, setBackedUp] = useState(false)

  // 지킬 것이 없으면 묻지 않는다: 어느 계정 것도 아닌 빈 기기는 그대로 잇고(남은 카테고리·지운 흔적도 이 계정에 반영),
  // 다른 계정 표시만 남은 빈 기기(꿈·지운 흔적·카테고리 기록 없음)는 비우고 잇는다
  useEffect(() => {
    if (ownerId === userId || count > 0) return
    if (ownerId === null) claim(userId)
    else if (deletedCount === 0 && logCount === 0) {
      useBucketStore.getState().clearLocalData()
      claim(userId)
    }
  }, [ownerId, count, deletedCount, logCount, claim, userId])

  if (ownerId === userId) return <SyncState />
  if (ownerId === null) {
    if (count === 0 || later) return null
    return (
      <div role="group" aria-label="꿈 옮기기" className="flex flex-col gap-2 rounded-[14px] border border-edge p-3 text-sm">
        <p>{`이 기기의 꿈 ${count}개를 계정에 옮길까요? 옮기면 다른 기기에서도 보여요.`}</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary press flex-1 text-sm" onClick={() => claim(userId)}>
            옮기기
          </button>
          <button type="button" className="btn press flex-1 text-sm" onClick={() => setLater(true)}>
            나중에
          </button>
        </div>
      </div>
    )
  }
  // 다른 계정의 꿈이 있는 기기: 저절로 올리지 않는다. 백업 파일을 받은 것을 확인한 뒤에만 지운다
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-[14px] border border-edge p-3 text-sm">
      <p>
        {`이 기기에는 다른 계정의 꿈 ${count}개${deletedCount > 0 ? `와 아직 올라가지 않은 삭제 ${deletedCount}개` : ''}가 있어요. 백업 파일을 받은 뒤 지우고 이 계정의 꿈을 불러올까요?`}
      </p>
      <div className="flex gap-2">
        {backedUp ? (
          <button
            type="button"
            className="btn btn-primary press flex-1 text-sm"
            onClick={() => {
              useBucketStore.getState().clearLocalData()
              claim(userId)
            }}
          >
            백업을 확인했어요, 지우기
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary press flex-1 text-sm"
            onClick={() => {
              downloadBackup()
              setBackedUp(true)
            }}
          >
            백업 파일 받기
          </button>
        )}
        <button type="button" className="btn press flex-1 text-sm" onClick={onSignOut}>
          로그아웃
        </button>
      </div>
    </div>
  )
}

function SyncState() {
  const { status, held, rejected } = useSyncStatus()
  const items = useBucketStore((s) => s.items)
  const deletedIds = useBucketStore((s) => s.deletedIds)
  if (status === 'held' && held) {
    const kept = new Set(mergeItems({ items, deleted: deletedIds }, held.snapshot).items.map((i) => i.id))
    const lost = items.filter((i) => !kept.has(i.id)).length
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-[14px] border border-danger p-3 text-sm">
        <p>{`동기화를 멈췄어요. 계정의 상태를 적용하면 이 기기의 꿈 ${lost}개가 사라져요. 먼저 백업해 두세요.`}</p>
        <button type="button" className="btn press text-sm" onClick={downloadBackup}>
          백업 파일 받기
        </button>
        <div className="flex gap-2">
          <button type="button" className="btn press flex-1 text-sm" onClick={applyHeld}>
            그래도 적용
          </button>
          <button type="button" className="btn press flex-1 text-sm" onClick={() => void reuploadLocal(sendChunk)}>
            이 기기 기준으로 다시 올리기
          </button>
        </div>
      </div>
    )
  }
  return (
    <>
      <p role="status" className="flex items-center gap-2 text-[13px] text-mute">
        {STATUS_TEXT[status === 'held' ? 'idle' : status]}
        {status === 'error' && (
          <button type="button" className="press min-h-11 px-1 text-ink underline" onClick={() => void requestSync(sendChunk)}>
            다시 시도
          </button>
        )}
      </p>
      {rejected > 0 && (
        <p className="text-[13px] text-danger">
          {`꿈 ${rejected}개는 계정에 올라가지 못해 이 기기에만 있어요(개수 한도 또는 형식 문제). 백업 파일로 보관해 두세요.`}
        </p>
      )}
    </>
  )
}
