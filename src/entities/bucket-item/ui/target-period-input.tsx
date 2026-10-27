import { DateTime } from 'luxon'

type Props = { value: string | null; onChange: (v: string | null) => void }

export function TargetPeriodInput({ value, onChange }: Props) {
  const [year = '', month = ''] = value?.split('-') ?? []
  const thisYear = DateTime.now().year
  const range = Array.from({ length: 31 }, (_, i) => thisYear + i)
  // 범위 밖 값(지난 연도 등)은 맨 앞에 둔다. 없으면 '연도 미정'으로 보인다
  const years = /^\d{4}$/.test(year) && !range.includes(Number(year)) ? [Number(year), ...range] : range
  const changeYear = (y: string) => onChange(y ? (month ? `${y}-${month}` : y) : null)

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-sm">
        연도
        <select className="field" value={year} onChange={(e) => changeYear(e.target.value)}>
          <option value="">연도 미정</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        월
        <select
          className="field"
          value={month}
          disabled={!year}
          onChange={(e) => onChange(e.target.value ? `${year}-${e.target.value}` : year)}
        >
          <option value="">월 미정</option>
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
            <option key={m} value={m}>
              {Number(m)}월
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
