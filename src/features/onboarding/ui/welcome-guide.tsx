import { useEffect, useRef, useState } from 'react'
import { StarIcon } from '@/shared/ui/star-icon'

type Step = { title: string; body: React.ReactNode }

const EXAMPLES = [
  ['아이슬란드에서 오로라 보기', '여행'],
  ['하프 마라톤 완주하기', '건강'],
  ['부모님과 제주 한 달 살기', '관계'],
  ['직접 만든 도자기로 밥 먹기', '배움'],
  ['비상금 1,000만 원 모으기', '재정'],
] as const

const STEPS: Step[] = [
  {
    title: '버킷리스트란?',
    body: (
      <>
        <p>살면서 꼭 해 보고 싶은 일을 적은 목록이에요.</p>
        <p className="text-mute">거창하지 않아도 돼요. 작은 일부터 큰 꿈까지, &lsquo;언젠가 해 보고 싶다&rsquo;면 모두 버킷리스트예요.</p>
      </>
    ),
  },
  {
    title: '왜 만들까요?',
    body: (
      <ul className="flex flex-col gap-3">
        <li>막연한 바람도 적어 두면 목표가 돼요.</li>
        <li>바쁜 하루 속에서 나에게 정말 중요한 게 뭔지 떠올리게 해요.</li>
        <li>하나씩 이룰 때마다 나만의 기록이 쌓여요.</li>
      </ul>
    ),
  },
  {
    title: '어떻게 만들까요?',
    body: (
      <>
        <ol className="flex list-decimal flex-col gap-3 pl-5">
          <li>해 보고 싶은 일을 한 줄로, 구체적으로 적어요.</li>
          <li>왜 하고 싶은지 적어요.</li>
          <li>언제쯤 할지 정해요. 몰라도 괜찮아요.</li>
          <li>가장 먼저 할 일 하나를 정해요.</li>
        </ol>
        <p className="text-mute">무엇을 적을지 막막하면 &lsquo;뭘 적을지 모르겠어요&rsquo;를 눌러 추천을 받아 보세요.</p>
      </>
    ),
  },
  {
    title: '이런 꿈을 적어요',
    body: (
      <ul className="flex flex-col gap-2">
        {EXAMPLES.map(([title, category]) => (
          <li key={title} className="surface flex items-center gap-3 p-3">
            <StarIcon fill="currentColor" className="size-4 shrink-0 text-gold" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words font-bold">{title}</span>
            <span className="shrink-0 text-[13px] text-mute">{category}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: '모든 꿈은 첫걸음에서 시작돼요',
    body: <p className="text-mute">오늘, 마음속 꿈 하나를 꺼내 적어 보세요.</p>,
  },
]

type Props = { onDone: (next: 'write' | 'browse') => void }

// 처음 열었을 때 한 단계씩 넘기는 안내
export function WelcomeGuide({ onDone }: Props) {
  const [index, setIndex] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const step = STEPS[index]!
  const last = index === STEPS.length - 1

  // 단계가 바뀌면 화면 읽기 프로그램이 새 제목부터 읽게 포커스를 옮긴다(첫 화면은 제외)
  useEffect(() => {
    if (index > 0) headingRef.current?.focus()
  }, [index])

  return (
    <section aria-label="첫걸음 안내" className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col gap-6">
      <header className="flex items-center justify-between">
        <p aria-label={`${STEPS.length}단계 중 ${index + 1}단계`} className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s.title} aria-hidden="true" className={`h-1.5 rounded-full ${i === index ? 'w-6 bg-gold' : 'w-1.5 bg-dim'}`} />
          ))}
        </p>
        {!last && (
          <button type="button" className="press min-h-11 px-2 text-sm text-mute" onClick={() => onDone('browse')}>
            건너뛰기
          </button>
        )}
      </header>
      <div key={index} className="rise flex flex-1 flex-col gap-4">
        <h1 ref={headingRef} tabIndex={-1} className="font-title text-2xl font-bold leading-snug outline-none">
          {step.title}
        </h1>
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed">{step.body}</div>
      </div>
      <div className="flex flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {last ? (
          <>
            <button type="button" className="btn btn-primary press min-h-[54px] text-base" onClick={() => onDone('write')}>
              첫 꿈 적기
            </button>
            <button type="button" className="btn press bg-transparent" onClick={() => onDone('browse')}>
              나중에 할게요
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            {index > 0 && (
              <button type="button" className="btn press bg-transparent px-5" onClick={() => setIndex(index - 1)}>
                이전
              </button>
            )}
            <button type="button" className="btn btn-primary press min-h-[54px] flex-1 text-base" onClick={() => setIndex(index + 1)}>
              다음
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
