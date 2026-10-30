import { Link, createFileRoute } from '@tanstack/react-router'
import { useId } from 'react'
import { type BucketItem, useBucketStore } from '@/entities/bucket-item'
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
      <ShareSection key={`share-${item.id}`} item={item} />
    </div>
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
