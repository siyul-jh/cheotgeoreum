import { StarIcon } from '@/shared/ui/star-icon'
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

// ponytail: 유성도 고정 [left%, top%, 지연s, 주기s, 길이px, 색]. 오른쪽 위에서 왼쪽 아래로
const METEORS = [
  [80, 4, 1.2, 5, 64, 'from-ink'],
  [96, 14, 1.9, 6.5, 44, 'from-gold-hi'],
  [62, 2, 2.6, 7, 52, 'from-ink'],
  [100, 34, 3.4, 5.5, 36, 'from-gold-hi'],
  [72, 22, 4.3, 8, 72, 'from-ink'],
  [44, 6, 5.1, 6, 40, 'from-gold-hi'],
  [90, 50, 5.8, 7.5, 56, 'from-ink'],
  [54, 28, 6.7, 9, 32, 'from-gold-hi'],
] as const

// 태양 햇살 8줄: 중심(28,28)에서 반지름 19~(긴 줄 27, 짧은 줄 24)
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  const r2 = i % 2 ? 24 : 27
  return [28 + Math.cos(a) * 19, 28 + Math.sin(a) * 19, 28 + Math.cos(a) * r2, 28 + Math.sin(a) * r2].map((n) => Math.round(n))
})

// ponytail: 구름 [top%, 폭px, 지연s(음수면 이미 떠가는 중), 주기s]
const CLOUDS = [
  [8, 64, -6, 38],
  [24, 44, -24, 52],
] as const
// 풀 [left%, bottom px, 지연s]
const TUFTS = [
  [8, 14, 0],
  [30, 18, 0.8],
  [57, 15, 0.4],
  [84, 20, 1.2],
] as const

// 라이트(태양) 모드의 하늘 아래 장면: 떠가는 구름, 초원 언덕, 바람에 흔들리는 풀. 다크의 유성우 자리다
function Meadow() {
  return (
    <div className="hidden light:block">
      {CLOUDS.map(([top, width, delay, duration]) => (
        <svg
          key={top}
          viewBox="0 0 64 28"
          className="drift absolute -left-1/4 text-white"
          style={{ top: `${top}%`, width, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
        >
          <g fill="currentColor">
            <circle cx={18} cy={17} r={10} />
            <circle cx={33} cy={12} r={12} />
            <circle cx={47} cy={17} r={9} />
            <rect x={8} y={16} width={48} height={11} rx={5.5} />
          </g>
        </svg>
      ))}
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-20 w-full">
        <path fill="#dcefc9" d="M0 13 Q22 3 48 10 T100 7 V24 H0Z" />
        <path fill="#bfe0a3" d="M0 18 Q30 10 62 16 T100 14 V24 H0Z" />
      </svg>
      {TUFTS.map(([left, bottom, delay]) => (
        <svg
          key={left}
          viewBox="0 0 14 14"
          className="sway absolute w-3.5 text-[#7fb85f]"
          style={{ left: `${left}%`, bottom, animationDelay: `${delay}s` }}
        >
          <path fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" d="M7 14Q6 7 2 3M7 14Q7 6 7 1M7 14Q8 7 12 4" />
        </svg>
      ))}
    </div>
  )
}

// 별이 떠오르는 동안 글자가 위에서부터 차례로 올라온다
const reveal = (i: number) => ({ animationDelay: `${0.7 + i * 0.12}s` })

// 공유 이미지(Canvas)와 칸·순서·문구가 같은 카드. 연출은 모션 축소 설정이어도 보인다(styles.css .star-card)
export function StarCard({ card, fill = false }: { card: CardModel; fill?: boolean }) {
  const meta = [card.period, card.category].filter(Boolean).join(' · ')
  // 폭은 감싼 쪽을 꽉 채운다(결과 화면은 버튼 폭과 같게). 카드 내용은 말줄임하지 않고 길면 늘어난다.
  // fill: 세로로 남은 공간을 채운다(한 화면에 버튼까지 들어오게). 아니면 9:16을 최소 높이로 둔다.
  // 9:16 최소 높이는 감싼 요소 폭(cqw) 기준. 컨테이너 쿼리 단위가 없는 브라우저는 내용 높이만큼만 보인다
  return (
    <div className={`@container flex w-full flex-col ${fill ? 'flex-1' : ''}`}>
      <figure
        aria-label={`${card.title} 별 카드`}
        className={`star-card rise relative flex flex-1 ${fill ? '' : 'min-h-[calc(100cqw*16/9)]'} w-full flex-col justify-center overflow-hidden rounded-[20px] border border-line bg-night px-5 pb-4 text-left light:bg-linear-to-b light:from-[#d9eefc] light:via-[#fff8e4] light:via-45% light:to-card`}
      >
        <div aria-hidden="true">
          {DOTS.map(([left, top, delay]) => (
            <span
              key={`${left}-${top}`}
              className="twinkle absolute size-0.5 rounded-full bg-ink opacity-50 light:hidden"
              style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }}
            />
          ))}
          {/* 유성우: 같은 방향으로 시차를 두고 떨어진다. 움직일 때만 보인다 */}
          {METEORS.map(([left, top, delay, duration, width, color]) => (
            <span
              key={`${left}-${top}`}
              className={`meteor absolute h-px bg-linear-to-l to-transparent light:hidden ${color}`}
              style={{ left: `${left}%`, top: `${top}%`, width, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
            />
          ))}
          <Meadow />
        </div>
        {/* ascend 끝(위로 40px, 1.4배)에서도 잘리지 않게 위 여백 pt-14, 정지 상태(원위치)는 제목 위에 있다 */}
        <div className="relative flex shrink-0 justify-center pt-14 pb-2">
          <div className="ascend relative size-14">
            {/* 은은한 빛무리. 다크는 별, 라이트는 햇살이 도는 태양 */}
            <span className="glow absolute -inset-5 rounded-full bg-gold/15 blur-xl light:bg-sun/30" />
            <StarIcon fill="currentColor" className="relative size-14 text-gold light:hidden" />
            <svg aria-hidden="true" viewBox="0 0 56 56" className="relative hidden size-14 text-sun light:block">
              <g className="spin origin-center [transform-box:fill-box]" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                {SUN_RAYS.map(([x1, y1, x2, y2]) => (
                  <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
                ))}
              </g>
              <circle cx={28} cy={28} r={13} fill="currentColor" />
            </svg>
          </div>
        </div>
        <figcaption className="relative flex min-h-0 flex-col gap-2 *:shrink-0">
          {meta && (
            <p className="rise break-words text-sm font-medium text-gold" style={reveal(0)}>
              {meta}
            </p>
          )}
          <p className="rise break-words font-title text-2xl font-bold leading-snug text-ink" style={reveal(1)}>
            {card.title}
          </p>
          {card.why && (
            <p className="rise break-words text-[15px] text-mute" style={reveal(2)}>
              {card.why}
            </p>
          )}
          {card.details.length > 0 && (
            <dl className="mt-1 flex flex-col gap-2">
              {card.details.map((d, i) => (
                <div key={d.label} className="rise min-w-0" style={reveal(3 + i)}>
                  <dt className="text-[13px] text-faint">{d.label}</dt>
                  <dd className="break-words text-[15px] text-ink">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </figcaption>
      </figure>
    </div>
  )
}
