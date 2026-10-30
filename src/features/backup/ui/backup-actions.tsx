import { DateTime } from 'luxon'
import { useRef, useState, type ChangeEvent } from 'react'
import { canImport, parseBackup, serializeBackup, useBucketStore } from '@/entities/bucket-item'

const MAX_BYTES = 1024 * 1024

function exportBackup() {
  const { items, customCategories } = useBucketStore.getState()
  // ponytail: 두 군데뿐이라 shared로 빼지 않음
  const url = URL.createObjectURL(new Blob([serializeBackup({ items, customCategories })], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `첫걸음-백업-${DateTime.now().toISODate()}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function BackupActions() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 change가 오도록
    if (!file) return
    setMessage('')
    if (!canImport()) return setMessage('더 새 버전 앱의 데이터라 가져올 수 없어요')
    let data
    try {
      if (file.size > MAX_BYTES) throw new Error('파일이 너무 큼')
      data = parseBackup(await file.text())
    } catch {
      return setMessage('가져올 수 없는 파일이에요')
    }
    // ponytail: 네이티브 확인창
    if (!window.confirm('지금 데이터를 가져온 파일로 바꿀까요?')) return
    useBucketStore.setState(data)
    setMessage('가져왔어요')
  }

  return (
    <div className="flex flex-col items-center gap-1 text-[13px] text-mute">
      <p className="flex items-center gap-2">
        <button type="button" className="press min-h-11 px-2 underline-offset-4 hover:underline" onClick={exportBackup}>
          데이터 내보내기
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className="press min-h-11 px-2 underline-offset-4 hover:underline" onClick={() => fileRef.current?.click()}>
          가져오기
        </button>
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void importFile(e)}
      />
      {/* 목록 화면에 다른 status가 있어 role 대신 aria-live. 비어 있어도 두어야 문구가 읽힌다 */}
      <p aria-live="polite" data-testid="backup-message">
        {message}
      </p>
    </div>
  )
}
