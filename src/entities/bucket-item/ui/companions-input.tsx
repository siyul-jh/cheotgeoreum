import { useId, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { fieldLimits } from '../model/schema'
import { selectCompanionNames, useBucketStore } from '../model/store'

type Props = { value: string[]; onChange: (v: string[]) => void }

const MAX_COMPANIONS = 30

export function CompanionsInput({ value, onChange }: Props) {
  const names = useBucketStore(useShallow(selectCompanionNames))
  const listId = useId()
  const [draft, setDraft] = useState('')

  const add = () => {
    const name = draft.trim()
    if (!name || value.includes(name) || value.length >= MAX_COMPANIONS) return
    onChange([...value, name])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2" aria-label="함께할 사람">
        {value.map((name) => (
          <li key={name} className="surface flex items-center gap-1 py-1 pl-3 pr-1 text-sm">
            {name}
            <button
              type="button"
              className="btn"
              aria-label={`${name} 삭제`}
              onClick={() => onChange(value.filter((n) => n !== name))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="field"
          aria-label="함께할 사람 이름"
          list={listId}
          value={draft}
          maxLength={fieldLimits.companion}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
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
