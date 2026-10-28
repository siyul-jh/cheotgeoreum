import { Link } from '@tanstack/react-router'
import { formatDate } from '@/shared/lib/date'
import { StarIcon } from '@/shared/ui/star-icon'
import { UNCATEGORIZED_LABEL, type BucketItem } from '../model/schema'
import { formatFieldValue } from '../lib/format-field'

type Props = { item: BucketItem; onToggleDone: () => void }

export function ItemCard({ item, onToggleDone }: Props) {
  const done = item.status === '완료'
  const { text, dueDate } = item.nextAction
  const nextAction = [text, dueDate && formatDate(dueDate)].filter(Boolean).join(' · ')
  const prereqDone = item.prerequisites.filter((p) => p.done).length
  const meta = [
    item.category ?? UNCATEGORIZED_LABEL,
    item.status,
    item.targetPeriod && formatFieldValue('targetPeriod', item),
    item.prerequisites.length > 0 && `선행 과제 ${prereqDone}/${item.prerequisites.length}`,
  ]
    .filter(Boolean)
    .join(' · ')
  const star = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' } as const

  return (
    <article className={`surface flex items-start gap-3 p-4 ${done ? 'border-gold-edge' : ''}`}>
      <button
        type="button"
        aria-label={`${item.title} 이룬 꿈`}
        aria-pressed={done}
        onClick={onToggleDone}
        className="press -ml-2.5 -mt-2.5 flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        {/* key: 켜질 때 새로 마운트돼야 pop이 다시 돈다 */}
        {done ? (
          <StarIcon key="on" {...star} fill="currentColor" className="pop size-5 text-gold" />
        ) : (
          <StarIcon key="off" {...star} fill="none" className={`size-5 ${prereqDone > 0 ? 'text-gold' : 'text-faint'}`} />
        )}
      </button>
      <Link to="/items/$id" params={{ id: item.id }} className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="break-words font-title text-[17px] font-bold">{item.title}</span>
        <span className="text-[13px] text-mute">{meta}</span>
        {nextAction && !done && <span className="break-words text-sm">다음 · {nextAction}</span>}
      </Link>
    </article>
  )
}
