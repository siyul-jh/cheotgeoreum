import { fieldLimits, type ItemValues } from '../model/schema'

type Props = { value: ItemValues['nextAction']; onChange: (v: ItemValues['nextAction']) => void }

export function NextActionInput({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* 바깥 legend(다음 행동/질문)가 그룹 이름이라 보이는 라벨은 두지 않는다 */}
      <input
        className="field"
        aria-label="할 일"
        placeholder="예: 항공권 가격 알림 설정"
        value={value.text}
        maxLength={fieldLimits.nextActionText}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
      />
      <label className="flex flex-col gap-1 text-[13px] text-mute">
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
