import { useId, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { XIcon } from '@/shared/ui/x-icon'
import { fieldLimits } from '../model/schema'
import { selectCompanionNames, useBucketStore } from '../model/store'

type Props = { value: string[]; onChange: (v: string[]) => void }

export function CompanionsInput({ value, onChange }: Props) {
  const names = useBucketStore(useShallow(selectCompanionNames))
  const listId = useId()
  const [draft, setDraft] = useState('')

  const add = () => {
    const name = draft.trim()
    if (!name || value.includes(name) || value.length >= fieldLimits.companionCount) return
    onChange([...value, name])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2" aria-label="함께할 사람">
        {value.map((name) => (
          <li key={name} className="flex items-center rounded-full border border-edge bg-card py-1 pl-3.5 text-sm">
            {name}
            {/* 보이는 칩은 작게, 누르는 영역은 44px */}
            <button
              type="button"
              className="-my-2 flex size-11 items-center justify-center rounded-full text-mute"
              aria-label={`${name} 삭제`}
              onClick={() => onChange(value.filter((n) => n !== name))}
            >
              <XIcon className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="field"
          aria-label="함께할 사람 이름"
          placeholder="이름"
          list={listId}
          value={draft}
          maxLength={fieldLimits.companion}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return // 229: Safari IME
            e.preventDefault()
            add()
          }}
        />
        <datalist id={listId}>
          {names.filter((n) => !value.includes(n)).map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <button type="button" className="btn shrink-0" onClick={add}>
          추가
        </button>
      </div>
    </div>
  )
}
