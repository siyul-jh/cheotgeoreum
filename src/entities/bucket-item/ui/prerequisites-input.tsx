import { useState } from 'react'
import { XIcon } from '@/shared/ui/x-icon'
import { fieldLimits, type ItemValues } from '../model/schema'

type Props = { value: ItemValues['prerequisites']; onChange: (v: ItemValues['prerequisites']) => void }

export function PrerequisitesInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const text = draft.trim()
    if (!text || value.length >= fieldLimits.prerequisiteCount) return
    onChange([...value, { text, done: false }])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {value.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-gold"
              aria-label={`${p.text} 완료`}
              checked={p.done}
              onChange={(e) => onChange(value.map((q, j) => (j === i ? { ...q, done: e.target.checked } : q)))}
            />
            <span className={`min-w-0 flex-1 break-words ${p.done ? 'text-mute line-through' : ''}`}>{p.text}</span>
            <button
              type="button"
              className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-mute"
              aria-label={`${p.text} 삭제`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <XIcon className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="field"
          aria-label="선행 과제"
          placeholder="예: 여권 갱신"
          value={draft}
          maxLength={fieldLimits.prerequisite}
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
    </div>
  )
}
