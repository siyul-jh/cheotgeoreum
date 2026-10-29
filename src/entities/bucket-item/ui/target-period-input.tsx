import { DateTime } from 'luxon'
import { useId, useState } from 'react'
import { TargetPeriodSchema, type PeriodKind, type TargetPeriod } from '../model/schema'

type Props = { value: TargetPeriod | null; onChange: (v: TargetPeriod | null) => void }

const KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: 'start', label: '이때쯤' },
  { kind: 'end', label: '이때까지' },
  { kind: 'range', label: '기간' },
]

export function TargetPeriodInput({ value, onChange }: Props) {
  const name = useId()
  // 값이 비어 있어도 고른 종류를 기억한다. 값이 있으면 값의 종류가 우선
  const [emptyKind, setEmptyKind] = useState<PeriodKind>(value?.kind ?? 'start')
  const kind = value?.kind ?? emptyKind
  // start/end의 시점 ↔ range의 시작
  const first = value === null ? null : value.kind === 'range' ? value.from : value.at
  const to = value?.kind === 'range' ? value.to : null
  const error = value?.kind === 'range' ? TargetPeriodSchema.safeParse(value).error?.issues[0]?.message : null

  const emit = (k: PeriodKind, from: string | null, end: string | null) => {
    setEmptyKind(k) // 값을 비워도 종류는 그대로
    if (k !== 'range') onChange(from ? { kind: k, at: from } : null)
    else onChange(from || end ? { kind: 'range', from, to: end } : null)
  }
  const changeKind = (k: PeriodKind) => {
    setEmptyKind(k)
    if (value) emit(k, first, null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="종류" className="grid grid-cols-3 gap-1.5">
        {KINDS.map((k) => (
          // 네이티브 라디오(화살표 키 이동)는 숨기고 라벨을 상태 칩 모양으로. 포커스 링은 라벨에 그린다
          <label
            key={k.kind}
            className="press flex h-11 cursor-pointer items-center justify-center rounded-full border border-edge text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:font-bold has-[:checked]:text-night has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold"
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={kind === k.kind}
              onChange={() => changeKind(k.kind)}
            />
            {k.label}
          </label>
        ))}
      </div>
      {kind === 'range' ? (
        <>
          <PointSelect label="시작" value={first} onChange={(p) => emit('range', p, to)} />
          <PointSelect label="끝" value={to} onChange={(p) => emit('range', first, p)} />
        </>
      ) : (
        <PointSelect value={first} onChange={(p) => emit(kind, p, null)} />
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

type PointProps = { label?: string; value: string | null; onChange: (v: string | null) => void }

function PointSelect({ label, value, onChange }: PointProps) {
  const [year = '', month = ''] = value?.split('-') ?? []
  const thisYear = DateTime.now().year
  const range = Array.from({ length: 31 }, (_, i) => thisYear + i)
  // 범위 밖 값(지난 연도 등)은 맨 앞에 둔다. 없으면 '연도 미정'으로 보인다
  const years = /^\d{4}$/.test(year) && !range.includes(Number(year)) ? [Number(year), ...range] : range
  const changeYear = (y: string) => onChange(y ? (month ? `${y}-${month}` : y) : null)
  const prefix = label ? `${label} ` : ''

  return (
    <div className={`grid items-center gap-2 ${label ? 'grid-cols-[auto_1fr_1fr]' : 'grid-cols-2'}`}>
      {label && (
        <span aria-hidden className="w-6 text-[13px] text-mute">
          {label}
        </span>
      )}
      {/* 바깥 legend가 그룹 이름. 선택지 문구('연도 미정'/'월 미정')가 보이는 라벨 역할을 한다 */}
      {/* 선택지 문구는 한 문자열로: 텍스트 노드가 나뉘면 base-select 목록에서 접근성 이름이 '2026 년'처럼 읽힌다 */}
      <select className="field select" aria-label={`${prefix}연도`} value={year} onChange={(e) => changeYear(e.target.value)}>
        <option value="">연도 미정</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {`${y}년`}
          </option>
        ))}
      </select>
      <select
        className="field select"
        aria-label={`${prefix}월`}
        value={month}
        disabled={!year}
        onChange={(e) => onChange(e.target.value ? `${year}-${e.target.value}` : year)}
      >
        <option value="">월 미정</option>
        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
          <option key={m} value={m}>
            {`${Number(m)}월`}
          </option>
        ))}
      </select>
    </div>
  )
}
