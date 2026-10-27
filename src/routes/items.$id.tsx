import { Link, createFileRoute } from '@tanstack/react-router'
import { useBucketStore } from '@/entities/bucket-item'
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

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label="닫기" className="btn inline-flex items-center">
          ✕
        </Link>
        <h1 className="font-bold">항목 편집</h1>
      </header>
      <ItemEditForm key={item.id} item={item} onDone={() => void navigate({ to: '/' })} />
    </div>
  )
}
