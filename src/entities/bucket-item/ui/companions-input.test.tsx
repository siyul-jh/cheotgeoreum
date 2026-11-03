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

test('기본 선택지와 전에 적은 이름을 눌러 넣는다. 이미 넣은 사람은 선택지에서 빠진다', () => {
  const onChange = vi.fn()
  render(<CompanionsInput value={['혼자']} onChange={onChange} />)
  expect(screen.queryByRole('button', { name: '혼자 추가' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '가족 추가' }))
  expect(onChange).toHaveBeenCalledWith(['혼자', '가족'])
  for (const name of ['친구', '연인', '동료']) expect(screen.getByRole('button', { name: `${name} 추가` })).toBeTruthy()
})
