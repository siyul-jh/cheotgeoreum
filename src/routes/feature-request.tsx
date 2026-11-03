import { Link, createFileRoute } from '@tanstack/react-router'
import { FeatureRequestForm, RequestList } from '@/features/feature-request'
import { XIcon } from '@/shared/ui/x-icon'

export const Route = createFileRoute('/feature-request')({ component: FeatureRequestPage })

function FeatureRequestPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <header className="flex items-center gap-3">
        <Link to="/settings" aria-label="닫기" className="press flex size-11 shrink-0 items-center justify-center rounded-full bg-card">
          <XIcon className="size-[18px]" />
        </Link>
        <h1 className="font-title text-xl font-bold">기능 요청하기</h1>
      </header>
      <section aria-label="새 요청" className="surface p-4">
        <FeatureRequestForm />
      </section>
      <section aria-labelledby="requests-all" className="surface flex flex-col gap-1 p-4">
        <h2 id="requests-all" className="text-sm font-bold">
          모두의 요청
        </h2>
        <RequestList />
      </section>
    </div>
  )
}
