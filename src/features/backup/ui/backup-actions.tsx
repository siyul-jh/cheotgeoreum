import { useRef, useState, type ChangeEvent } from 'react'
import { canImport, downloadBackup, parseBackup, useBucketStore } from '@/entities/bucket-item'

const MAX_BYTES = 1024 * 1024

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
    if (!window.confirm('가져온 꿈을 더하고, 같은 꿈은 가져온 내용으로 덮어써요. 가져올까요?')) return
    useBucketStore.getState().importBackup(data)
    setMessage('가져왔어요')
  }

  return (
    <div className="flex flex-col items-center gap-1 text-sm text-mute">
      <p className="flex items-center gap-2">
        <button type="button" className="press min-h-11 px-2 underline-offset-4 hover:underline" onClick={downloadBackup}>
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
