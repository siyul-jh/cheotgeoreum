import { Link, createFileRoute } from '@tanstack/react-router'
import { useShallow } from 'zustand/react/shallow'
import {
  ItemCard,
  STATUSES,
  UNCATEGORIZED_FILTER,
  UNCATEGORIZED_LABEL,
  selectCategories,
  useBucketStore,
  type Status,
} from '@/entities/bucket-item'

type ListSearch = { category?: string; status?: Status }

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

  const visible = items.filter(
    (i) =>
      (category === undefined || (category === UNCATEGORIZED_FILTER ? i.category === null : i.category === category)) &&
      (status === undefined || i.status === status),
  )

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">첫걸음</h1>
        <Link to="/items/new" className="btn btn-primary inline-flex items-center">
          + 새 항목
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm">
          카테고리
          <select
            className="field"
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
        <label className="flex flex-col gap-1 text-sm">
          상태
          <select
            className="field"
            value={status ?? ''}
            onChange={(e) =>
              void navigate({ search: (prev) => ({ ...prev, status: STATUSES.find((s) => s === e.target.value) }) })
            }
          >
            <option value="">전체</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="surface p-6 text-center text-sm text-mute">
          {items.length === 0
            ? '아직 항목이 없어요. "+ 새 항목"으로 첫 버킷리스트를 적어 보세요.'
            : '조건에 맞는 항목이 없어요.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
