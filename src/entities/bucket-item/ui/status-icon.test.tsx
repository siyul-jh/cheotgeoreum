// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { STATUSES } from '../model/schema'
import { StatusIcon } from './status-icon'

afterEach(cleanup)

test('상태마다 서로 다른 장식 아이콘을 그린다', () => {
  const { container } = render(
    <>
      {STATUSES.map((s) => (
        <StatusIcon key={s} status={s} />
      ))}
    </>,
  )
  const icons = Array.from(container.querySelectorAll('svg'))
  expect(icons.map((i) => i.dataset.status)).toEqual([...STATUSES])
  expect(icons.every((i) => i.getAttribute('aria-hidden') === 'true')).toBe(true)
  // 진행 중·완료는 같은 별 모양에 채움만 다르다
  expect(new Set(icons.map((i) => i.outerHTML.replace(/ data-status="[^"]*"/, ''))).size).toBe(STATUSES.length)
})
