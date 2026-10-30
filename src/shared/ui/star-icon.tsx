import type { CSSProperties, SVGProps } from 'react'

// 18×18 기준. 공유 카드(canvas Path2D)도 같은 모양을 쓴다
export const STAR_PATH = 'M9 1.8l2.1 4.6 5 .6-3.7 3.4 1 4.9L9 12.8l-4.4 2.5 1-4.9L1.9 7l5-.6z'

export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" {...props}>
      <path d={STAR_PATH} />
    </svg>
  )
}

// 라이트(태양) 모드 짝: 18×18 해와 구름. filled면 해 원을 채운다(햇살은 늘 선)
export function SunIcon({ filled = false, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" {...props}>
      <circle cx={9} cy={9} r={3.4} fill={filled ? 'currentColor' : 'none'} />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" />
    </svg>
  )
}

export function CloudIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" {...props}>
      <path d="M5 14h8.5a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6-1A3.5 3.5 0 0 0 5 14z" />
    </svg>
  )
}

type BurstProps = { count: number; dx: number; dy: number; delay?: number; className: string }

// 한 점에서 사방으로 흩어지는 작은 별들. 위치는 className(absolute 기준점)으로 정한다
export function StarBurst({ count, dx, dy, delay = 0, className }: BurstProps) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2
    const style = {
      '--dx': `${Math.round(Math.cos(a) * dx)}px`,
      '--dy': `${Math.round(Math.sin(a) * dy)}px`,
      animationDelay: `${delay + i * 0.03}s`,
    } as CSSProperties
    return (
      <StarIcon key={i} fill="currentColor" className={`burst absolute size-3 text-gold ${className}`} style={style} />
    )
  })
}
