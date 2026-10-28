import type { CSSProperties, SVGProps } from 'react'

export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" {...props}>
      <path d="M9 1.8l2.1 4.6 5 .6-3.7 3.4 1 4.9L9 12.8l-4.4 2.5 1-4.9L1.9 7l5-.6z" />
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
