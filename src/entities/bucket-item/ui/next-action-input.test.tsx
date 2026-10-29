// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { formatDate } from '@/shared/lib/date'
import { NextActionInput } from './next-action-input'

beforeEach(() => {
  // jsdom에는 popover API(showPopover)가 없다. 열린 달력을 흉내 내려고 popover를 보이게 둔다
  document.head.innerHTML = '<style>[popover] { display: block !important }</style>'
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 10, 12)) // 2026-11-10
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const cell = (iso: string) => screen.getByRole('gridcell', { name: formatDate(iso) })

test('트리거는 고른 날짜를 보이고 대화상자를 연다고 알린다', () => {
  render(<NextActionInput value={{ text: '', dueDate: '2026-11-20' }} onChange={vi.fn()} />)
  const trigger = screen.getByRole('button', { name: /날짜/ })
  expect(trigger.textContent).toContain(formatDate('2026-11-20'))
  expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
  expect(cell('2026-11-20').getAttribute('aria-selected')).toBe('true')
})

test('날짜를 누르면 ISO 날짜로 바꾼다', () => {
  const onChange = vi.fn()
  render(<NextActionInput value={{ text: '여권', dueDate: null }} onChange={onChange} />)
  expect(screen.getByRole('button', { name: /날짜/ }).textContent).toContain('날짜 선택')
  fireEvent.click(cell('2026-11-20'))
  expect(onChange).toHaveBeenCalledWith({ text: '여권', dueDate: '2026-11-20' })
})

test('지난 날짜는 비활성이고 눌러도 바뀌지 않는다. 오늘은 고를 수 있다', () => {
  const onChange = vi.fn()
  render(<NextActionInput value={{ text: '', dueDate: null }} onChange={onChange} />)
  expect(cell('2026-11-09').getAttribute('aria-disabled')).toBe('true')
  fireEvent.click(cell('2026-11-09'))
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '이전 달' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '오늘' }))
  expect(onChange).toHaveBeenCalledWith({ text: '', dueDate: '2026-11-10' })
})

test('지우기는 null로 바꾼다', () => {
  const onChange = vi.fn()
  render(<NextActionInput value={{ text: '', dueDate: '2026-11-20' }} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '지우기' }))
  expect(onChange).toHaveBeenCalledWith({ text: '', dueDate: null })
})

test('방향키로 날짜를 옮기고 달을 넘기며 Enter로 고른다', () => {
  const onChange = vi.fn()
  render(<NextActionInput value={{ text: '', dueDate: '2026-11-27' }} onChange={onChange} />)
  const start = cell('2026-11-27')
  start.focus()
  fireEvent.keyDown(start, { key: 'ArrowRight' })
  expect(document.activeElement).toBe(cell('2026-11-28'))
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(cell('2026-12-05'))
  expect(screen.getByRole('grid', { name: '2026년 12월' })).toBeTruthy()
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
  expect(onChange).toHaveBeenCalledWith({ text: '', dueDate: '2026-12-05' })
})

test('방향키로 오늘 이전으로는 가지 않는다', () => {
  render(<NextActionInput value={{ text: '', dueDate: null }} onChange={vi.fn()} />)
  const today = cell('2026-11-10')
  today.focus()
  fireEvent.keyDown(today, { key: 'ArrowUp' })
  expect(document.activeElement).toBe(today)
})
