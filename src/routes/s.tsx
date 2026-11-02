import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { openShared, StarCard, useStarCard, type ListEntry } from '@/features/share-card'
import { formatFieldValue, StatusIcon, UNCATEGORIZED_LABEL, type ItemValues } from '@/entities/bucket-item'

export const Route = createFileRoute('/s')({ component: SharedCardRoute })

type Decoded =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'card'; values: ItemValues }
  | { status: 'list'; items: ListEntry[] }

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
    openShared(hash).then(
      (shared) =>
        live && setDecoded(shared.kind === 'card' ? { status: 'card', values: shared.values } : { status: 'list', items: shared.items }),
      () => live && setDecoded({ status: 'error' }),
    )
    return () => {
      live = false
    }
  }, [hash])

  // 결과 화면처럼 카드가 남은 높이를 채워 한 화면에 버튼까지 들어오게
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col items-center gap-[18px] text-center">
      {decoded.status !== 'list' && <h1 className="sr-only">받은 별 카드</h1>}
      {decoded.status === 'card' ? (
        <ReceivedCard values={decoded.values} />
      ) : decoded.status === 'list' ? (
        <ReceivedList items={decoded.items} />
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

// 받은 목록은 보여 주기만 한다. 이룬 꿈은 별(완료 아이콘)로
function ReceivedList({ items }: { items: ListEntry[] }) {
  const done = items.filter((i) => i.done).length
  return (
    <>
      <header className="flex w-full flex-col gap-1 text-left">
        <h1 className="font-title text-2xl font-bold">받은 버킷리스트</h1>
        <p className="text-sm text-mute">{`${items.length}개 중 ${done}개 이룸`}</p>
      </header>
      <ul className="flex w-full flex-1 flex-col gap-2 text-left">
        {items.map((item, i) => (
          <li key={i} className={`surface rise flex items-start gap-3 p-4 ${item.done ? 'border-gold-edge' : ''}`} style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}>
            {/* 이룬 꿈은 채운 별, 아직은 빈 별 */}
            <StatusIcon status={item.done ? '완료' : '진행 중'} className={`mt-0.5 size-5 shrink-0 ${item.done ? 'text-gold' : 'text-mute'}`} />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="break-words font-title text-[17px] font-bold">
                {item.title}
                {item.done && <span className="sr-only"> (이룬 꿈)</span>}
              </span>
              <span className="text-[13px] text-mute">
                {[item.category ?? UNCATEGORIZED_LABEL, item.targetPeriod && formatFieldValue('targetPeriod', item)].filter(Boolean).join(' · ')}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-4 w-full">
        <WriteMine />
      </div>
    </>
  )
}

const WriteMine = () => (
  <Link to="/items/new" className="btn btn-primary press flex w-full items-center justify-center">
    나도 적어보기
  </Link>
)
