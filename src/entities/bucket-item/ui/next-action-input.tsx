import { fieldLimits, type ItemValues } from '../model/schema'

type Props = { value: ItemValues['nextAction']; onChange: (v: ItemValues['nextAction']) => void }

// 첫 행동은 날짜 없이 한 줄만 받는다. 알림은 목표 시기가 맡는다
export function NextActionInput({ value, onChange }: Props) {
  return (
    // 바깥 legend(다음 행동/질문)가 그룹 이름이라 보이는 라벨은 두지 않는다
    <input
      className="field"
      aria-label="할 일"
      placeholder="예: 항공권 가격 알림 설정"
      value={value.text}
      maxLength={fieldLimits.nextActionText}
      // 예전에 고른 날짜는 할 일을 고치면 함께 지운다(날짜를 고칠 곳이 없으니)
      onChange={(e) => onChange({ text: e.target.value, dueDate: null })}
    />
  )
}
