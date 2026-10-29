// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DateTime } from 'luxon'
import { afterEach, expect, test, vi } from 'vitest'
import { TargetPeriodInput } from './target-period-input'

afterEach(cleanup)

test('연도를 바꿔도 정한 월은 유지한다', () => {
  const onChange = vi.fn()
  const y = DateTime.now().year
  render(<TargetPeriodInput value={{ kind: 'start', at: `${y}-05` }} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('연도'), { target: { value: String(y + 1) } })
  expect(onChange).toHaveBeenCalledWith({ kind: 'start', at: `${y + 1}-05` })
})

test('지난 연도 값도 그대로 보인다', () => {
  render(<TargetPeriodInput value={{ kind: 'start', at: '2020-05' }} onChange={vi.fn()} />)
  expect((screen.getByLabelText('연도') as HTMLSelectElement).value).toBe('2020')
  expect((screen.getByLabelText('월') as HTMLSelectElement).value).toBe('05')
})
