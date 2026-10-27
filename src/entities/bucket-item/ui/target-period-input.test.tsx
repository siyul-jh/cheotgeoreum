// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DateTime } from 'luxon'
import { afterEach, expect, test, vi } from 'vitest'
import { TargetPeriodInput } from './target-period-input'

afterEach(cleanup)

test('연도를 바꿔도 정한 월은 유지한다', () => {
  const onChange = vi.fn()
  const y = DateTime.now().year
  render(<TargetPeriodInput value={`${y}-05`} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('연도'), { target: { value: String(y + 1) } })
  expect(onChange).toHaveBeenCalledWith(`${y + 1}-05`)
})
