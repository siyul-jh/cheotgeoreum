import type { SVGProps } from 'react'

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...props}>
      <path d="M4 4l10 10M14 4L4 14" />
    </svg>
  )
}
