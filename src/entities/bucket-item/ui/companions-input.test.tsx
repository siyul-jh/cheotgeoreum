// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { CompanionsInput } from './companions-input'

afterEach(cleanup)

test('중복 이름은 넣지 않고 30명이 차면 더 추가하지 않는다', () => {
  const onChange = vi.fn()
  const full = Array.from({ length: 30 }, (_, i) => `사람${i}`)
  const { rerender } = render(<CompanionsInput value={full} onChange={onChange} />)
  const input = screen.getByLabelText('함께할 사람 이름')
  fireEvent.change(input, { target: { value: '엄마' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange).not.toHaveBeenCalled()
  rerender(<CompanionsInput value={full.slice(1)} onChange={onChange} />)
  fireEvent.change(input, { target: { value: '사람1' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { value: '엄마' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange).toHaveBeenCalledWith([...full.slice(1), '엄마'])
})
