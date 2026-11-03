// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { NextActionInput } from './next-action-input'

afterEach(cleanup)

test('할 일만 받고 날짜는 고르지 않는다. 고치면 예전 날짜는 지운다', () => {
  const onChange = vi.fn()
  render(<NextActionInput value={{ text: '여권', dueDate: '2026-11-20' }} onChange={onChange} />)
  expect(screen.queryByRole('button')).toBeNull()
  fireEvent.change(screen.getByLabelText('할 일'), { target: { value: '여권 사진' } })
  expect(onChange).toHaveBeenCalledWith({ text: '여권 사진', dueDate: null })
})
