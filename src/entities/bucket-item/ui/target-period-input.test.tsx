// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DateTime } from 'luxon'
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { TargetPeriod } from '../model/schema'
import { TargetPeriodInput } from './target-period-input'

afterEach(cleanup)

const y = DateTime.now().year
const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement

test('연도를 바꿔도 정한 월은 유지한다', () => {
  const onChange = vi.fn()
  render(<TargetPeriodInput value={{ kind: 'start', at: `${y}-05` }} onChange={onChange} />)
  fireEvent.change(select('연도'), { target: { value: String(y + 1) } })
  expect(onChange).toHaveBeenCalledWith({ kind: 'start', at: `${y + 1}-05` })
})

test('지난 연도 값도 그대로 보인다', () => {
  render(<TargetPeriodInput value={{ kind: 'start', at: '2020-05' }} onChange={vi.fn()} />)
  expect(select('연도').value).toBe('2020')
  expect(select('월').value).toBe('05')
})

test('종류는 같은 name의 네이티브 라디오 3개(화살표 키로 이동), 비어 있으면 이때쯤', () => {
  render(<TargetPeriodInput value={null} onChange={vi.fn()} />)
  const radios = screen.getAllByRole('radio') as HTMLInputElement[]
  expect(radios.map((r) => r.labels?.[0]?.textContent)).toEqual(['이때쯤', '이때까지', '기간'])
  expect(new Set(radios.map((r) => r.name)).size).toBe(1)
  expect(radios[0].name).not.toBe('')
  expect(radio('이때쯤').checked).toBe(true)
  expect(screen.getByRole('radiogroup', { name: '종류' })).toBeDefined()
})

test('비어 있을 때 종류를 먼저 고르면 그 종류로 시점이 정해진다', () => {
  const onChange = vi.fn()
  render(<TargetPeriodInput value={null} onChange={onChange} />)
  fireEvent.click(radio('이때까지'))
  expect(onChange).not.toHaveBeenCalled()
  expect(radio('이때까지').checked).toBe(true)
  fireEvent.change(select('연도'), { target: { value: String(y + 1) } })
  expect(onChange).toHaveBeenCalledWith({ kind: 'end', at: String(y + 1) })
})

test('이때쯤 → 기간: 고른 시점이 시작이 된다', () => {
  const onChange = vi.fn()
  render(<TargetPeriodInput value={{ kind: 'start', at: `${y}-05` }} onChange={onChange} />)
  fireEvent.click(radio('기간'))
  expect(onChange).toHaveBeenCalledWith({ kind: 'range', from: `${y}-05`, to: null })
})

test('기간 → 이때까지: 시작이 시점이 된다', () => {
  const onChange = vi.fn()
  render(<TargetPeriodInput value={{ kind: 'range', from: `${y}-05`, to: String(y + 1) }} onChange={onChange} />)
  fireEvent.click(radio('이때까지'))
  expect(onChange).toHaveBeenCalledWith({ kind: 'end', at: `${y}-05` })
})

test('기간은 시작·끝 두 줄, 끝을 고르면 둘 다 담아 보낸다', () => {
  const onChange = vi.fn()
  render(<TargetPeriodInput value={{ kind: 'range', from: `${y}-05`, to: null }} onChange={onChange} />)
  expect(select('시작 연도').value).toBe(String(y))
  expect(select('시작 월').value).toBe('05')
  expect(screen.queryByLabelText('연도')).toBeNull()
  fireEvent.change(select('끝 연도'), { target: { value: String(y + 1) } })
  expect(onChange).toHaveBeenCalledWith({ kind: 'range', from: `${y}-05`, to: String(y + 1) })
})

test('기간에서 시작·끝을 모두 비우면 null', () => {
  const onChange = vi.fn()
  render(<TargetPeriodInput value={{ kind: 'range', from: String(y), to: null }} onChange={onChange} />)
  fireEvent.change(select('시작 연도'), { target: { value: '' } })
  expect(onChange).toHaveBeenCalledWith(null)
})

test.each([
  [{ kind: 'range', from: null, to: String(y) }, '시작을 골라 주세요'],
  [{ kind: 'range', from: String(y + 1), to: `${y}-05` }, '끝이 시작보다 빨라요'],
] as const)('기간이 덜 채워졌거나 역순이면 이유를 보인다 %o', (value, message) => {
  render(<TargetPeriodInput value={value} onChange={vi.fn()} />)
  expect(screen.getByRole('alert').textContent).toBe(message)
})

test('끝을 정하지 않은 기간은 오류가 없다', () => {
  render(<TargetPeriodInput value={{ kind: 'range', from: String(y), to: null }} onChange={vi.fn()} />)
  expect(screen.queryByRole('alert')).toBeNull()
})

test('완성된 기간은 오류가 없다', () => {
  render(<TargetPeriodInput value={{ kind: 'range', from: `${y}-03`, to: String(y) }} onChange={vi.fn()} />)
  expect(screen.queryByRole('alert')).toBeNull()
})

// 값을 비워도 고른 종류는 그대로다(다시 고르면 같은 종류로 저장)
test('이때까지 값의 연도를 미정으로 바꿔도 종류는 이때까지로 남는다', () => {
  function Controlled() {
    const [value, setValue] = useState<TargetPeriod | null>({ kind: 'end', at: String(y + 1) })
    return <TargetPeriodInput value={value} onChange={setValue} />
  }
  render(<Controlled />)
  fireEvent.change(select('연도'), { target: { value: '' } })
  expect(radio('이때까지').checked).toBe(true)
})

test('이때까지에서 기간으로 바꾸면 그 시점은 끝이 된다', () => {
  const onChange = vi.fn()
  render(<TargetPeriodInput value={{ kind: 'end', at: `${y + 1}-02` }} onChange={onChange} />)
  fireEvent.click(radio('기간'))
  expect(onChange).toHaveBeenCalledWith({ kind: 'range', from: null, to: `${y + 1}-02` })
})
