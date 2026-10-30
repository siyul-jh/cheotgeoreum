import { StarBurst, StarIcon } from '@/shared/ui/star-icon'
import type { CardModel } from '../lib/card-model'

// ponytail: 배경 별은 고정 좌표 [left%, top%, 지연s]. 매번 같은 하늘이면 충분하다
const DOTS = [
  [12, 8, 0],
  [78, 6, 1.1],
  [90, 22, 2.3],
  [6, 30, 0.6],
  [64, 18, 1.8],
  [30, 4, 2.7],
  [86, 48, 0.3],
  [8, 62, 1.5],
  [92, 74, 2.1],
  [16, 88, 0.9],
  [72, 92, 2.5],
  [48, 96, 1.3],
] as const

// 공유 이미지(Canvas)와 칸·순서·문구가 같은 9:16 카드. 모션 축소면 별은 원위치에 정지(styles.css)
export function StarCard({ card }: { card: CardModel }) {
  const meta = [card.period, card.category].filter(Boolean).join(' · ')
  return (
    <figure
      aria-label={`${card.title} 별 카드`}
      className="rise relative flex aspect-[9/16] w-full max-w-[20rem] flex-col justify-center overflow-hidden rounded-[20px] border border-line bg-night px-5 pb-5 text-left"
    >
      <div aria-hidden="true">
        {DOTS.map(([left, top, delay]) => (
          <span
            key={`${left}-${top}`}
            className="twinkle absolute size-0.5 rounded-full bg-ink opacity-50"
            style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      {/* ascend 끝(위로 40px, 1.4배)에서도 잘리지 않게 위 여백 pt-14, 정지 상태(원위치)는 제목 위에 있다 */}
      <div className="relative flex shrink-0 justify-center pt-14 pb-4">
        <div className="relative flex size-14 items-center justify-center">
          <StarBurst count={10} dx={90} dy={90} delay={0.3} className="left-[22px] top-[22px]" />
          {/* 떠오른 별을 따라가도록 반복 반짝임을 별과 함께 띄운다. 첫 퍼짐(1.2s)이 끝난 뒤 시작 */}
          <div className="ascend relative size-14">
            <StarBurst count={8} dx={34} dy={34} delay={1.4} loop className="left-[22px] top-[22px]" />
            <StarIcon fill="currentColor" className="size-14 text-gold" />
          </div>
        </div>
      </div>
      <figcaption className="relative flex min-h-0 flex-col gap-2 *:shrink-0">
        {meta && <p className="truncate text-xs text-gold">{meta}</p>}
        <p className="line-clamp-3 break-words font-title text-xl font-bold text-ink">{card.title}</p>
        {card.why && (
          <p className={`${card.details.length > 0 ? 'line-clamp-2' : 'line-clamp-3'} break-words text-[13px] text-mute`}>
            {card.why}
          </p>
        )}
        {card.details.length > 0 && (
          <dl className="mt-1 flex flex-col gap-1.5 text-xs">
            {card.details.map((d) => (
              <div key={d.label} className="min-w-0">
                <dt className="text-faint">{d.label}</dt>
                <dd className="truncate text-ink">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </figcaption>
    </figure>
  )
}
