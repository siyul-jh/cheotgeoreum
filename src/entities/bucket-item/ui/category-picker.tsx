import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DEFAULT_CATEGORIES, fieldLimits } from '../model/schema'
import { selectCategories, useBucketStore } from '../model/store'

type Props = { value: string | null; onChange: (v: string | null) => void }

const isDefault = (name: string) => DEFAULT_CATEGORIES.some((c) => c === name)

export function CategoryPicker({ value, onChange }: Props) {
  const categories = useBucketStore(useShallow(selectCategories))
  const addCategory = useBucketStore((s) => s.addCategory)
  const deleteCategory = useBucketStore((s) => s.deleteCategory)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)

  const add = () => {
    const name = draft.trim()
    if (!addCategory(name)) {
      setError(`이미 있거나 쓸 수 없는 이름이에요. 1~${fieldLimits.category}자로 입력해 주세요.`)
      return
    }
    setError('')
    setDraft('')
    onChange(name)
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2" aria-label="카테고리">
        {categories.map((name) => (
          <li key={name} className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={value === name}
              onClick={() => onChange(value === name ? null : name)}
              className={`btn ${value === name ? 'btn-primary' : ''}`}
            >
              {name}
            </button>
            {!isDefault(name) &&
              (confirming === name ? (
                <span className="flex items-center gap-1 text-sm" role="group" aria-label={`${name} 삭제 확인`}>
                  항목은 미분류로 바뀌어요.
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      deleteCategory(name)
                      if (value === name) onChange(null)
                      setConfirming(null)
                    }}
                  >
                    삭제
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirming(null)}>
                    취소
                  </button>
                </span>
              ) : (
                <button type="button" className="btn" aria-label={`${name} 삭제`} onClick={() => setConfirming(name)}>
                  ×
                </button>
              ))}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="field"
          aria-label="새 카테고리 이름"
          value={draft}
          maxLength={fieldLimits.category}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return // 229: Safari IME
            e.preventDefault()
            add()
          }}
        />
        <button type="button" className="btn shrink-0" onClick={add}>
          추가
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
