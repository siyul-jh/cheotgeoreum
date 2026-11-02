import { useState } from 'react'
import { fieldLimits } from '../model/schema'

type Props = {
  label: string
  submitLabel: string
  placeholder?: string
  initial?: string
  // 저장했으면 true. false면 이름 오류 문구를 보여 준다
  onSubmit: (name: string) => boolean
  onCancel?: () => void
}

// 카테고리 이름 입력 한 줄(새 꿈의 추가 · 설정의 추가·이름 바꾸기)
export function CategoryNameForm({ label, submitLabel, placeholder, initial = '', onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const submit = () => {
    if (!onSubmit(draft.trim())) {
      setError(`이미 있거나 쓸 수 없는 이름이에요. 1~${fieldLimits.category}자로 입력해 주세요.`)
      return
    }
    setError('')
    setDraft('')
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className="field"
          aria-label={label}
          placeholder={placeholder}
          value={draft}
          maxLength={fieldLimits.category}
          autoFocus={onCancel !== undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel?.()
            if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return // 229: Safari IME
            e.preventDefault()
            submit()
          }}
        />
        <button type="button" className="btn shrink-0" onClick={submit}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn shrink-0" onClick={onCancel}>
            취소
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
