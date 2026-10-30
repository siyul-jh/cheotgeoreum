import { DateTime } from 'luxon'
import { useEffect, useId, useRef, useState } from 'react'
import { formatDate } from '@/shared/lib/date'
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
      <DueDatePicker value={value.dueDate} onChange={(dueDate) => onChange({ ...value, dueDate })} />
    </div>
  )
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
const iso = (d: DateTime) => d.toFormat('yyyy-MM-dd')

// 네이티브 date 팝업은 꾸밀 수 없어 popover로 만든 달력. popover="auto"가 Esc·바깥 클릭 닫힘과 포커스 순서를 준다
function DueDatePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const labelId = useId()
  const triggerId = useId()
  const popId = useId()
  const headingId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLTableElement>(null)
  const moveFocus = useRef(false)
  const refocus = useRef(false)
  const today = iso(DateTime.now())
  // 지난 날짜는 고를 수 없다(AI 초안 sanitize와 같은 규칙: 오늘 이후. 스키마는 막지 않는다)
  const start = value && value >= today ? value : today
  const [focused, setFocused] = useState(start)
  const [open, setOpen] = useState(false)

  const month = DateTime.fromISO(focused).startOf('month')
  const first = month.minus({ days: month.weekday % 7 }) // 일요일 시작
  const weeks = Math.ceil(((month.weekday % 7) + month.daysInMonth!) / 7)

  // 방향키로 옮긴 날짜로 포커스를 따라가게 한다(달이 바뀌면 칸이 새로 그려진다)
  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
  }, [focused, open])

  const move = (d: string) => {
    setFocused(d < today ? today : d)
    moveFocus.current = true
  }
  const pick = (d: string | null) => {
    if (d !== null && d < today) return
    onChange(d)
    triggerRef.current?.focus()
    popRef.current?.hidePopover?.() // ponytail: jsdom에는 popover API가 없다
  }

  return (
    <div className="flex flex-col gap-1">
      <span id={labelId} className="text-[13px] text-mute">
        날짜
      </span>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        popoverTarget={popId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${triggerId}`}
        className={`field flex cursor-pointer items-center justify-between gap-2 text-left ${value ? '' : 'text-mute'}`}
      >
        {value ? formatDate(value) : '날짜 선택'}
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4 shrink-0 text-mute">
          <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
          <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" strokeLinecap="round" />
        </svg>
      </button>
      <div
        ref={popRef}
        id={popId}
        popover="auto"
        role="dialog"
        aria-labelledby={headingId}
        // Esc로 닫힐 때 포커스가 달력 안이었으면 트리거로 돌려준다(버튼 클릭이 포커스를 주지 않는 Safari·macOS 대비)
        onBeforeToggle={(e) => {
          refocus.current = e.newState === 'closed' && !!popRef.current?.contains(document.activeElement)
        }}
        onToggle={(e) => {
          const isOpen = e.newState === 'open'
          setOpen(isOpen)
          if (isOpen) move(start)
          else if (refocus.current) triggerRef.current?.focus()
        }}
        className="surface anchored w-72 max-w-[calc(100vw-2rem)] p-3 text-ink"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 달"
            disabled={month <= DateTime.fromISO(today).startOf('month')}
            onClick={() => setFocused(iso(month.minus({ months: 1 })) < today ? today : iso(month.minus({ months: 1 })))}
            className="press flex size-11 items-center justify-center rounded-full disabled:text-dim"
          >
            <Chevron d="M10 4l-4 4 4 4" />
          </button>
          <p id={headingId} aria-live="polite" className="font-bold">
            {`${month.year}년 ${month.month}월`}
          </p>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => setFocused(iso(month.plus({ months: 1 })))}
            className="press flex size-11 items-center justify-center rounded-full"
          >
            <Chevron d="M6 4l4 4-4 4" />
          </button>
        </div>
        <table
          ref={gridRef}
          role="grid"
          aria-labelledby={headingId}
          className="w-full table-fixed text-center text-sm"
          onKeyDown={(e) => {
            const step = STEPS[e.key]
            if (step) move(iso(DateTime.fromISO(focused).plus({ days: step })))
            else if (e.key === 'Enter' || e.key === ' ') pick(focused)
            else return
            e.preventDefault()
          }}
        >
          <thead>
            <tr>
              {WEEKDAYS.map((w) => (
                <th key={w} scope="col" className="py-1 text-xs font-normal text-mute">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: weeks }, (_, w) => (
              <tr key={w}>
                {Array.from({ length: 7 }, (_, i) => {
                  const day = first.plus({ days: w * 7 + i })
                  if (day.month !== month.month) return <td key={i} />
                  const d = iso(day)
                  const past = d < today
                  const selected = d === value
                  return (
                    <td
                      key={i}
                      role="gridcell"
                      tabIndex={d === focused ? 0 : -1}
                      aria-label={formatDate(d)}
                      aria-selected={selected}
                      aria-disabled={past}
                      aria-current={d === today ? 'date' : undefined}
                      onClick={() => pick(d)}
                      className={`h-10 rounded-full outline-gold focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
                        past
                          ? 'cursor-not-allowed text-dim'
                          : selected
                            ? 'press bg-gold-fill font-bold text-on-gold'
                            : `press ${d === today ? 'font-bold text-gold' : ''}`
                      }`}
                    >
                      {day.day}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn press" onClick={() => pick(today)}>
            오늘
          </button>
          <button type="button" className="btn press bg-transparent" onClick={() => pick(null)}>
            지우기
          </button>
        </div>
      </div>
    </div>
  )
}

function Chevron({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d={d} />
    </svg>
  )
}
