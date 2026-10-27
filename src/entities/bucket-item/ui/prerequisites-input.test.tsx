// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { PrerequisitesInput } from './prerequisites-input'

afterEach(cleanup)

test('IME 조합 중 Enter는 항목을 추가하지 않는다', () => {
  const onChange = vi.fn()
  render(<PrerequisitesInput value={[]} onChange={onChange} />)
  const input = screen.getByLabelText('선행 과제')
  fireEvent.change(input, { target: { value: '여권' } })
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 }) // Safari IME
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onChange).toHaveBeenCalledWith([{ text: '여권', done: false }])
})

test('30개가 차면 더 추가하지 않는다', () => {
  const onChange = vi.fn()
  const full = Array.from({ length: 30 }, (_, i) => ({ text: `과제${i}`, done: false }))
  const { rerender } = render(<PrerequisitesInput value={full} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('선행 과제'), { target: { value: '여권' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange).not.toHaveBeenCalled()
  rerender(<PrerequisitesInput value={full.slice(1)} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(onChange).toHaveBeenCalledWith([...full.slice(1), { text: '여권', done: false }])
})
