// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore } from '../model/store'
import { CategoryPicker } from './category-picker'

beforeEach(() => useBucketStore.setState({ items: [], customCategories: ['독서'] }))
afterEach(cleanup)

test('× → 확인을 누르면 삭제된다', () => {
  const onChange = vi.fn()
  render(<CategoryPicker value="독서" onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '독서 삭제' }))
  fireEvent.click(screen.getByRole('button', { name: '삭제' }))
  expect(useBucketStore.getState().customCategories).toEqual([])
  expect(onChange).toHaveBeenCalledWith(null)
})

test('기본 카테고리에는 ×가 없다', () => {
  render(<CategoryPicker value={null} onChange={vi.fn()} />)
  expect(screen.queryByRole('button', { name: '여행 삭제' })).toBeNull()
  expect(screen.getByRole('button', { name: '독서 삭제' })).toBeTruthy()
})

test('31자 이상 이름을 추가하면 오류 문구가 나온다', () => {
  render(<CategoryPicker value={null} onChange={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('새 카테고리 이름'), { target: { value: 'a'.repeat(31) } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(screen.getByRole('alert').textContent).toContain('1~30자')
  expect(useBucketStore.getState().customCategories).toEqual(['독서'])
})

test('IME 조합 중 Enter(Safari keyCode 229)는 추가하지 않는다', () => {
  render(<CategoryPicker value={null} onChange={vi.fn()} />)
  const input = screen.getByLabelText('새 카테고리 이름')
  fireEvent.change(input, { target: { value: '덕질' } })
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
  expect(useBucketStore.getState().customCategories).toEqual(['독서'])
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(useBucketStore.getState().customCategories).toEqual(['독서', '덕질'])
})
