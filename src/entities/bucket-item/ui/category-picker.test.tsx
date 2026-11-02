// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore } from '../model/store'
import { CategoryPicker, LONG_PRESS_MS } from './category-picker'

beforeEach(() => useBucketStore.setState({ items: [], customCategories: ['독서'] }))
afterEach(cleanup)

function longPress(el: HTMLElement) {
  vi.useFakeTimers()
  fireEvent.pointerDown(el)
  act(() => vi.advanceTimersByTime(LONG_PRESS_MS))
  fireEvent.pointerUp(el)
  fireEvent.click(el) // 꾹 누른 뒤 따라오는 click
  vi.useRealTimers()
}

test('×는 꾹 누르기 전엔 없고, 꾹 누르면 흔들리며 나온다(선택은 바뀌지 않는다)', () => {
  const onChange = vi.fn()
  render(<CategoryPicker value={null} onChange={onChange} />)
  expect(screen.queryByRole('button', { name: '독서 삭제' })).toBeNull()
  const chip = screen.getByRole('button', { name: '독서' })
  longPress(chip)
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '독서 삭제' })).toBeTruthy()
  expect(chip.closest('li')!.className).toContain('wiggle')
  fireEvent.click(screen.getByRole('button', { name: '완료' }))
  expect(screen.queryByRole('button', { name: '독서 삭제' })).toBeNull()
})

test('짧게 누르면 선택만 한다', () => {
  const onChange = vi.fn()
  render(<CategoryPicker value={null} onChange={onChange} />)
  const chip = screen.getByRole('button', { name: '독서' })
  fireEvent.pointerDown(chip)
  fireEvent.pointerUp(chip)
  fireEvent.click(chip)
  expect(onChange).toHaveBeenCalledWith('독서')
  expect(screen.queryByRole('button', { name: '독서 삭제' })).toBeNull()
})

test('편집 모드에서 × → 확인을 누르면 삭제되고, 마지막이면 편집 모드도 끝난다', () => {
  const onChange = vi.fn()
  render(<CategoryPicker value="독서" onChange={onChange} />)
  fireEvent.contextMenu(screen.getByRole('button', { name: '독서' }))
  fireEvent.click(screen.getByRole('button', { name: '독서 삭제' }))
  fireEvent.click(screen.getByRole('button', { name: '삭제' }))
  expect(useBucketStore.getState().customCategories).toEqual([])
  expect(onChange).toHaveBeenCalledWith(null)
  expect(screen.queryByRole('button', { name: '완료' })).toBeNull()
})

test('기본 카테고리는 꾹 눌러도 편집 모드가 되지 않는다', () => {
  render(<CategoryPicker value={null} onChange={vi.fn()} />)
  fireEvent.contextMenu(screen.getByRole('button', { name: '여행' }))
  expect(screen.queryByRole('button', { name: '완료' })).toBeNull()
  fireEvent.contextMenu(screen.getByRole('button', { name: '독서' }))
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
