import { Link } from '@tanstack/react-router'
import { formatDate } from '@/shared/lib/date'
import { UNCATEGORIZED_LABEL, type BucketItem } from '../model/schema'
import { formatFieldValue } from '../lib/format-field'
import { StatusIcon } from './status-icon'

type Props = { item: BucketItem; onToggleDone: () => void }

export function ItemCard({ item, onToggleDone }: Props) {
  const done = item.status === '완료'
  const { text, dueDate } = item.nextAction
  const prereqDone = item.prerequisites.filter((p) => p.done).length
  const meta = [
    item.category ?? UNCATEGORIZED_LABEL,
    item.status,
    item.targetPeriod && formatFieldValue('targetPeriod', item),
    item.prerequisites.length > 0 && `선행 과제 ${prereqDone}/${item.prerequisites.length}`,
  ]
    .filter(Boolean)
    .join(' · ')
  // 완료·진행 중은 포인트색, 나머지는 보조색. 포기는 더 흐리게(faint도 카드 배경 대비 3:1 이상)
  const tone = item.status === '완료' || item.status === '진행 중' ? 'text-gold' : item.status === '포기' ? 'text-faint' : 'text-mute'

  return (
    <article className={`surface flex h-full items-start gap-3 p-4 ${done ? 'border-gold-edge' : ''}`}>
      <button
        type="button"
        aria-label={`${item.title} 이룬 꿈`}
        aria-pressed={done}
        onClick={onToggleDone}
        className="press -ml-2.5 -mt-2.5 flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        {/* key: 상태가 바뀌면 새로 마운트돼야 완료될 때 pop이 다시 돈다 */}
        <StatusIcon key={item.status} status={item.status} className={`size-5 ${tone} ${done ? 'pop' : ''}`} />
      </button>
      <Link to="/items/$id" params={{ id: item.id }} className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="break-words font-title text-[17px] font-bold">{item.title}</span>
        <span className="text-[13px] text-mute">{meta}</span>
        {(text || dueDate) && !done && (
          <span className="break-words text-sm">
            다음 · {text}
            {text && dueDate && ' · '}
            {dueDate && <time dateTime={dueDate}>{formatDate(dueDate)}</time>}
          </span>
        )}
      </Link>
    </article>
  )
}
