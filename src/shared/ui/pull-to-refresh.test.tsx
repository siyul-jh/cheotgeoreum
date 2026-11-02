import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { PULL_THRESHOLD, PullToRefresh } from './pull-to-refresh'

const reload = vi.fn()
vi.stubGlobal('location', { ...location, reload })
afterEach(() => reload.mockClear())

function drag(target: Element, dy: number) {
  act(() => {
    fireEvent.touchStart(target, { touches: [{ clientY: 0 }] })
    fireEvent.touchMove(target, { touches: [{ clientY: dy }] })
    fireEvent.touchEnd(target)
  })
}

test('맨 위에서 기준 넘게 당겼다 놓으면 새로고침, 덜 당기거나 입력 칸 위면 안 한다', () => {
  const { container } = render(
    <>
      <PullToRefresh enabled />
      <input />
    </>,
  )
  drag(document.body, PULL_THRESHOLD * 2 - 2)
  expect(reload).not.toHaveBeenCalled()
  drag(container.querySelector('input')!, PULL_THRESHOLD * 2 + 10)
  expect(reload).not.toHaveBeenCalled()
  drag(document.body, PULL_THRESHOLD * 2 + 10)
  expect(reload).toHaveBeenCalledOnce()
})
