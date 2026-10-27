import { Link } from '@tanstack/react-router'
import { formatDate } from '@/shared/lib/date'
import { UNCATEGORIZED_LABEL, type BucketItem } from '../model/schema'
import { formatFieldValue } from '../lib/format-field'

export function ItemCard({ item }: { item: BucketItem }) {
  const { text, dueDate } = item.nextAction
  const nextAction = [text, dueDate && formatDate(dueDate)].filter(Boolean).join(' · ')
  return (
    <Link to="/items/$id" params={{ id: item.id }} className="surface flex flex-col gap-1 p-4 hover:bg-zinc-50">
      <span className="break-words font-semibold">{item.title}</span>
      <span className="text-sm text-zinc-600">
        {item.category ?? UNCATEGORIZED_LABEL} · {item.status}
      </span>
      {item.targetPeriod && (
        <span className="text-sm text-zinc-600">{formatFieldValue('targetPeriod', item)}</span>
      )}
      {nextAction && <span className="break-words text-sm">다음 행동: {nextAction}</span>}
    </Link>
  )
}
