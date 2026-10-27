import { fieldLimits, type ItemValues } from '../model/schema'

type Props = { value: ItemValues['nextAction']; onChange: (v: ItemValues['nextAction']) => void }

export function NextActionInput({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        다음 행동
        <input
          className="field"
          value={value.text}
          maxLength={fieldLimits.nextActionText}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        날짜
        <input
          type="date"
          className="field"
          value={value.dueDate ?? ''}
          onChange={(e) => onChange({ ...value, dueDate: e.target.value || null })}
        />
      </label>
    </div>
  )
}
