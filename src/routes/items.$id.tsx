import { Link, createFileRoute } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { type BucketItem, fieldLimits, useBucketStore } from '@/entities/bucket-item'
import { formatFullDate } from '@/shared/lib/date'
import { StarCard, useStarCard } from '@/features/share-card'
import { XIcon } from '@/shared/ui/x-icon'
import { ItemEditForm } from './-components/item-edit-form'

export const Route = createFileRoute('/items/$id')({ component: EditItemPage })

function EditItemPage() {
  const { id } = Route.useParams()
  const item = useBucketStore((s) => s.items.find((i) => i.id === id))
  const navigate = Route.useNavigate()

  if (!item) {
    return (
      <div className="flex flex-col gap-3">
        <p>항목을 찾을 수 없어요.</p>
        <Link to="/" className="btn inline-flex items-center">
          목록으로
        </Link>
      </div>
    )
  }

  // 넓은 화면에서 입력칸이 지나치게 늘어나지 않게 폭을 제한한다
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="flex items-center gap-3">
        <Link
          to="/"
          aria-label="닫기"
          className="press flex size-11 shrink-0 items-center justify-center rounded-full bg-card"
        >
          <XIcon className="size-[18px]" />
        </Link>
        <h1 className="font-title text-xl font-bold">항목 편집</h1>
      </header>
      <ItemEditForm key={item.id} item={item} onDone={() => void navigate({ to: '/' })} />
      {item.status === '완료' && <AchievementSection key={`done-${item.id}`} item={item} />}
      <ShareSection key={`share-${item.id}`} item={item} />
    </div>
  )
}

// 이룬 꿈의 기록: 이룬 날과 한 줄 소감(저장된 상태가 '완료'일 때만)
function AchievementSection({ item }: { item: BucketItem }) {
  const headingId = useId()
  const setReflection = useBucketStore((s) => s.setReflection)
  const [text, setText] = useState(item.reflection ?? '')
  const [saved, setSaved] = useState(false)
  const changed = text.trim() !== (item.reflection ?? '')
  return (
    <section aria-labelledby={headingId} className="surface flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-sm font-bold">
          이룬 기록
        </h2>
        <p className="text-[13px] text-mute">{item.achievedAt ? `${formatFullDate(item.achievedAt)}에 이뤘어요.` : '이룬 날이 기록되지 않았어요.'}</p>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setReflection(item.id, text.trim())
          setSaved(true)
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          한 줄 소감
          <textarea
            value={text}
            maxLength={fieldLimits.reflection}
            rows={2}
            placeholder="해 보니 어땠나요? (예: 생각보다 추웠지만 평생 기억날 밤)"
            className="field resize-none"
            onChange={(e) => {
              setText(e.target.value)
              setSaved(false)
            }}
          />
        </label>
        <button type="submit" className="btn press self-end px-6" disabled={!changed}>
          소감 저장
        </button>
        <p role="status" className="min-h-5 text-sm text-mute">
          {saved && !changed ? '저장했어요.' : ''}
        </p>
      </form>
    </section>
  )
}

// 저장된 내용으로 그린 별 카드. 고친 내용은 저장한 뒤에 카드에 반영된다
function ShareSection({ item }: { item: BucketItem }) {
  const headingId = useId()
  const { card, url, png, share, save, notice } = useStarCard(item)
  return (
    <section aria-labelledby={headingId} className="surface flex flex-col items-center gap-4 p-4">
      <div className="flex w-full flex-col gap-1">
        <h2 id={headingId} className="text-sm font-bold">
          별 카드
        </h2>
        <p className="text-[13px] text-mute">저장된 내용으로 만들어요.</p>
      </div>
      {/* 넓은 화면에서 카드가 너무 커지지 않게 폭 상한 */}
      <div className="w-full max-w-[20rem]">
        <StarCard card={card} />
      </div>
      <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
        <button type="button" className="btn btn-primary press md:px-8" disabled={url === null} onClick={() => void share()}>
          공유하기
        </button>
        <button type="button" className="btn press md:px-8" disabled={png === null} onClick={save}>
          이미지로 저장
        </button>
      </div>
      <p role="status" className="min-h-5 text-sm text-mute">
        {notice}
      </p>
    </section>
  )
}
