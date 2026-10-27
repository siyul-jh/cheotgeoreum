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
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onChange).toHaveBeenCalledWith([{ text: '여권', done: false }])
})
