import type { ReactNode, SVGProps } from 'react'
import { StarIcon } from '@/shared/ui/star-icon'
import type { Status } from '../model/schema'

type Props = { status: Status } & SVGProps<SVGSVGElement>

const PATHS: Record<Exclude<Status, '진행 중' | '완료'>, ReactNode> = {
  // 전구
  아이디어: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />,
  // 노트와 연필
  계획: <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M8 9h4M8 13h3M18.4 2.6a2 2 0 0 1 2.9 2.9L13 13.8l-3.8 1 1-3.8z" />,
  // Zzz: 같은 크기(4.5) Z 세 개를 같은 간격으로 대각선 배치
  보류: <path d="M2.5 16.5h4.5l-4.5 4.5h4.5M10 10.5h4.5L10 15h4.5M17.5 4.5H22l-4.5 4.5H22" />,
  // 흰 깃발: 깃대 + 채운 천
  포기: (
    <>
      <path d="M5 21V4" />
      <path fill="currentColor" d="M5 4.5c4-2 7 2 11 0v8.5c-4 2-7-2-11 0z" />
    </>
  ),
}

// 상태 장식 아이콘(글자 라벨과 함께 쓰므로 aria-hidden). 색은 currentColor라 쓰는 곳이 정한다. 진행 중·완료는 기존 별
export function StatusIcon({ status, ...props }: Props) {
  if (status === '진행 중' || status === '완료') {
    return (
      <StarIcon
        data-status={status}
        fill={status === '완료' ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        {...props}
      />
    )
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      data-status={status}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {PATHS[status]}
    </svg>
  )
}
