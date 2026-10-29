import { Link, createFileRoute } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  ItemCard,
  STATUSES,
  UNCATEGORIZED_FILTER,
  UNCATEGORIZED_LABEL,
  pickTodayStep,
  selectCategories,
  useBucketStore,
  type BucketItem,
  type BucketItemInput,
  type Status,
} from '@/entities/bucket-item'
import { formatDate } from '@/shared/lib/date'
import { StarBurst } from '@/shared/ui/star-icon'

type ListSearch = { category?: string; status?: Status }

// 상태 칩: [전체] + 모든 상태. 완료는 목록에서 '이룬 꿈'으로 부른다
const CHIPS: { label: string; status?: Status }[] = [
  { label: '전체' },
  ...STATUSES.map((s) => ({ label: s === '완료' ? '이룬 꿈' : s, status: s })),
]

// 배경 별 좌표(%) — 시안 390×844 화면 기준을 비율로 옮김
const SKY = [
  [6, 5],
  [77, 3],
  [90, 17],
  [15, 36],
  [85, 50],
  [5, 66],
  [72, 83],
  [38, 94],
]

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): ListSearch => ({
    category: typeof search.category === 'string' && search.category ? search.category : undefined,
    status: STATUSES.find((s) => s === search.status),
  }),
  component: ListPage,
})

function ListPage() {
  const { category, status } = Route.useSearch()
  const navigate = Route.useNavigate()
  const items = useBucketStore((s) => s.items)
  const categories = useBucketStore(useShallow(selectCategories))
  const updateItem = useBucketStore((s) => s.updateItem)
  const heroId = useId()
  // [했어요]로 다음 행동이 비면 오늘의 첫걸음 후보에서 빠지므로, 축하할 항목을 따로 기억한다
  const [stepped, setStepped] = useState<BucketItem | null>(null)
  const today = pickTodayStep(items)

  const save = ({ id, createdAt, ...input }: BucketItem, patch: Partial<BucketItemInput>) =>
    updateItem(id, { ...input, ...patch })

  const visible = items.filter(
    (i) =>
      (category === undefined || (category === UNCATEGORIZED_FILTER ? i.category === null : i.category === category)) &&
      (status === undefined || i.status === status),
  )

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        {SKY.map(([x, y], i) => (
          <span
            key={i}
            className="twinkle absolute size-0.5 rounded-full bg-ink opacity-50"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </div>

      {/* 모든 폭에서 위쪽 패널 → 아래 카드 grid. DOM 순서가 시각·탭 순서와 같다 */}
      <div className="relative flex flex-col gap-5">
        <h1 className="sr-only">첫걸음</h1>

        <div className="flex flex-col gap-5">
          {(stepped || today) && (
            <section aria-labelledby={heroId} className="surface flex flex-col gap-2.5 rounded-[20px] p-[18px]">
              <h2 id={heroId} className="text-[13px] text-mute">
                오늘의 첫걸음
              </h2>
              {stepped ? (
                <div key="stepped" role="status" className="rise relative flex flex-col gap-2.5">
                  <StarBurst count={8} dx={70} dy={50} className="left-10 top-5" />
                  <p className="font-title text-2xl font-bold leading-snug">한 걸음 나아갔어요</p>
                  <p className="break-words text-sm text-mute">
                    {stepped.title}에 별 하나가 더 켜졌어요. 다음 첫걸음을 정해 볼까요?
                  </p>
                  <Link
                    to="/items/$id"
                    params={{ id: stepped.id }}
                    className="btn press inline-flex items-center self-start border-gold bg-transparent font-bold text-gold"
                  >
                    다음 행동 정하기
                  </Link>
                </div>
              ) : (
                today && (
                  <div key={today.id} className="rise flex flex-col gap-2.5">
                    <p className="break-words font-title text-2xl font-bold leading-snug">{today.nextAction.text}</p>
                    <p className="break-words text-sm text-gold">
                      {today.title}
                      {today.nextAction.dueDate && ` · ${formatDate(today.nextAction.dueDate)}까지`}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary press self-start"
                      onClick={() => {
                        save(today, { nextAction: { text: '', dueDate: null } })
                        setStepped(today)
                      }}
                    >
                      했어요
                    </button>
                  </div>
                )
              )}
            </section>
          )}

          {/* 상태 칩 한 줄(휴대폰은 가로 스크롤, py-1은 포커스 링이 잘리지 않게) → 카테고리·새 꿈. md 이상은 한 줄 */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div
              role="group"
              aria-label="상태"
              className="-mx-4 -my-1 flex gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:mx-0 md:flex-1 md:flex-wrap md:overflow-visible md:px-0"
            >
              {CHIPS.map((c) => {
                const on = status === c.status
                return (
                  <button
                    key={c.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => void navigate({ search: (prev) => ({ ...prev, status: c.status }) })}
                    className={`press h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-sm ${on ? 'bg-ink font-bold text-night' : 'border border-edge'}`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-mute">
                <span className="shrink-0">카테고리</span>
                <select
                  className="field select text-sm md:w-36"
                  value={category ?? ''}
                  onChange={(e) => void navigate({ search: (prev) => ({ ...prev, category: e.target.value || undefined }) })}
                >
                  <option value="">전체</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={UNCATEGORIZED_FILTER}>{UNCATEGORIZED_LABEL}</option>
                </select>
              </label>
              <Link to="/items/new" className="btn btn-primary press inline-flex shrink-0 items-center whitespace-nowrap text-sm">
                + 새 꿈
              </Link>
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="surface p-6 text-center text-sm text-mute">
            {items.length === 0 ? '아직 띄운 꿈이 없어요. "+ 새 꿈"으로 첫 별을 띄워 보세요.' : '조건에 맞는 꿈이 없어요.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3">
            {visible.map((item, i) => (
              <li key={item.id} className="rise" style={{ animationDelay: `${i * 60}ms` }}>
                <ItemCard
                  item={item}
                  onToggleDone={() => save(item, { status: item.status === '완료' ? '진행 중' : '완료' })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
