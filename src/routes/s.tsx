import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { decodeCard, StarCard, useStarCard } from '@/features/share-card'
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

  // 결과 화면처럼 카드가 남은 높이를 채워 한 화면에 버튼까지 들어오게
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col items-center gap-[18px] text-center">
      <h1 className="sr-only">받은 별 카드</h1>
      {decoded.status === 'ok' ? (
        <ReceivedCard values={decoded.values} />
      ) : (
        <>
          {decoded.status === 'error' && <p role="alert">카드를 열 수 없어요</p>}
          {/* 해독 중에는 카드와 같은 크기의 빈 틀로 화면이 흔들리지 않게 한다 */}
          {decoded.status === 'loading' && <div aria-hidden="true" className="w-full flex-1" />}
          <WriteMine />
        </>
      )}
    </div>
  )
}

// 받은 사람도 카드를 이미지로 간직할 수 있다
function ReceivedCard({ values }: { values: ItemValues }) {
  const { card, png, save, notice } = useStarCard(values)
  return (
    <>
      <StarCard card={card} fill />
      <div className="flex w-full flex-col gap-2">
        <WriteMine />
        <button type="button" className="btn press" disabled={png === null} onClick={save}>
          이미지로 저장
        </button>
      </div>
      <p role="status" className="min-h-5 text-sm text-mute">
        {notice}
      </p>
    </>
  )
}

const WriteMine = () => (
  <Link to="/items/new" className="btn btn-primary press flex w-full items-center justify-center">
    나도 적어보기
  </Link>
)
