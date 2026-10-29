import { Link, createFileRoute } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  ItemCard,
  STATUSES,
  UNCATEGORIZED_FILTER,
  UNCATEGORIZED_LABEL,
  StatusIcon,
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

// 히어로 한 줄: 휴대폰은 세로, md 이상은 글 왼쪽 · 버튼 오른쪽(세로 가운데)
const HERO_ROW = 'flex flex-col gap-2.5 md:flex-row md:items-center md:gap-6'
const HERO_ACTION = 'shrink-0 self-start md:self-center'

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
  const doneCount = items.filter((i) => i.status === '완료').length
  // 후보가 없을 때 히어로가 안내할 항목: 다음 행동이 빈 첫 진행 중·계획 항목
  const needsStep = items.find(
    (i) => (i.status === '진행 중' || i.status === '계획') && i.nextAction.text.trim() === '',
  )

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

      {/* 머리줄 → 히어로 → 필터 → 카드. DOM 순서가 시각·탭 순서와 같다 */}
      <div className="relative flex flex-col gap-5">
        <header className="flex min-h-11 items-center gap-3">
          <h1 className="shrink-0 font-title text-2xl font-bold">첫걸음</h1>
          {items.length > 0 && (
            <p className="min-w-0 truncate text-sm text-mute">{`${items.length}개 중 ${doneCount}개 이룸`}</p>
          )}
          <Link
            to="/items/new"
            className="btn btn-primary press ml-auto inline-flex shrink-0 items-center whitespace-nowrap text-sm"
          >
            + 새 꿈
          </Link>
        </header>

        <div className="flex flex-col gap-5">
          {/* 항목이 하나라도 있으면 늘 보인다(후보가 없으면 빈 상태). md 이상은 글 왼쪽 · 버튼 오른쪽 */}
          {items.length > 0 && (
            <section aria-labelledby={heroId} className="surface flex flex-col gap-2.5 rounded-[20px] p-[18px]">
              <h2 id={heroId} className="text-[13px] text-mute">
                오늘의 첫걸음
              </h2>
              {stepped ? (
                <div key="stepped" role="status" className={`rise relative ${HERO_ROW}`}>
                  <StarBurst count={8} dx={70} dy={50} className="left-10 top-5" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <p className="font-title text-2xl font-bold leading-snug">한 걸음 나아갔어요</p>
                    <p className="break-words text-sm text-mute">
                      {stepped.title}에 별 하나가 더 켜졌어요. 다음 첫걸음을 정해 볼까요?
                    </p>
                  </div>
                  <Link
                    to="/items/$id"
                    params={{ id: stepped.id }}
                    className={`btn press inline-flex items-center border-gold bg-transparent font-bold text-gold ${HERO_ACTION}`}
                  >
                    다음 행동 정하기
                  </Link>
                </div>
              ) : today ? (
                <div key={today.id} className={`rise ${HERO_ROW}`}>
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <p className="break-words font-title text-2xl font-bold leading-snug">{today.nextAction.text}</p>
                    <p className="break-words text-sm text-gold">
                      {today.title}
                      {today.nextAction.dueDate && ` · ${formatDate(today.nextAction.dueDate)}까지`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-primary press ${HERO_ACTION}`}
                    onClick={() => {
                      save(today, { nextAction: { text: '', dueDate: null } })
                      setStepped(today)
                    }}
                  >
                    했어요
                  </button>
                </div>
              ) : (
                <div key="empty" className={`rise ${HERO_ROW}`}>
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <p className="font-title text-2xl font-bold leading-snug">다음 행동을 정해 보세요</p>
                    <p className="break-words text-sm text-mute">
                      {needsStep
                        ? `${needsStep.title}의 첫걸음을 정하면 여기에 보여요.`
                        : '새 꿈을 띄우고 첫걸음을 정해 보세요.'}
                    </p>
                  </div>
                  {needsStep ? (
                    <Link
                      to="/items/$id"
                      params={{ id: needsStep.id }}
                      className={`btn press inline-flex items-center border-gold bg-transparent font-bold text-gold ${HERO_ACTION}`}
                    >
                      다음 행동 정하기
                    </Link>
                  ) : (
                    <Link to="/items/new" className={`btn btn-primary press inline-flex items-center ${HERO_ACTION}`}>
                      + 새 꿈
                    </Link>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 상태 칩 한 줄(넘치면 가로 스크롤, py·px 여백은 포커스 링이 잘리지 않게) → 카테고리. md 이상은 칩 왼쪽 · 카테고리 오른쪽 한 줄 */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div
              role="group"
              aria-label="상태"
              className="-mx-4 -my-1 flex gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:-mx-1 md:min-w-0 md:flex-1 md:px-1"
            >
              {CHIPS.map((c) => {
                const on = status === c.status
                return (
                  <button
                    key={c.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => void navigate({ search: (prev) => ({ ...prev, status: c.status }) })}
                    className={`press inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm ${on ? 'bg-ink font-bold text-night' : 'border border-edge'}`}
                  >
                    {c.status && <StatusIcon status={c.status} className="size-4 shrink-0" />}
                    {c.label}
                  </button>
                )
              })}
            </div>
            <label className="flex min-w-0 items-center gap-2 text-[13px] text-mute md:shrink-0">
              <span className="shrink-0">카테고리</span>
              <select
                className="field select md:w-36"
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
