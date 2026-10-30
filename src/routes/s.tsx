import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { buildCardModel, decodeCard, StarCard } from '@/features/share-card'
import type { ItemValues } from '@/entities/bucket-item'

export const Route = createFileRoute('/s')({ component: SharedCardRoute })

type Decoded = { status: 'loading' } | { status: 'error' } | { status: 'ok'; values: ItemValues }

// hash가 바뀌면 key로 다시 마운트해 상태를 처음(loading)으로 되돌린다
function SharedCardRoute() {
  const hash = useLocation({ select: (l) => l.hash })
  return <SharedCard key={hash} hash={hash} />
}

// 받은 카드는 저장소에 넣지 않고 보여주기만 한다
function SharedCard({ hash }: { hash: string }) {
  const [decoded, setDecoded] = useState<Decoded>({ status: 'loading' })
  useEffect(() => {
    let live = true
    decodeCard(hash).then(
      (values) => live && setDecoded({ status: 'ok', values }),
      () => live && setDecoded({ status: 'error' }),
    )
    return () => {
      live = false
    }
  }, [hash])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-[18px] text-center">
      <h1 className="sr-only">받은 별 카드</h1>
      {decoded.status === 'ok' && <StarCard card={buildCardModel(decoded.values)} />}
      {decoded.status === 'error' && <p role="alert">카드를 열 수 없어요</p>}
      {/* 해독 중에는 카드와 같은 크기의 빈 틀로 화면이 흔들리지 않게 한다 */}
      {decoded.status === 'loading' && <div aria-hidden="true" className="aspect-[9/16] w-full max-w-[20rem]" />}
      <Link to="/items/new" className="btn btn-primary press flex w-full items-center justify-center">
        나도 적어보기
      </Link>
    </div>
  )
}
