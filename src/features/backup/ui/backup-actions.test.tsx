// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DateTime } from 'luxon'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { STORAGE_KEY, serializeBackup, useBucketStore, type BucketItem } from '@/entities/bucket-item'
import { BackupActions } from './backup-actions'

const item = (title: string): BucketItem => ({
  id: title,
  createdAt: '2026-10-01T00:00:00.000Z',
  title,
  why: '',
  category: null,
  targetPeriod: null,
  prerequisites: [],
  nextAction: { text: '', dueDate: null },
  status: '아이디어',
  companions: [],
})

beforeEach(() => {
  localStorage.clear()
  useBucketStore.setState({ items: [item('지금')], customCategories: [] })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const pick = (text: string) => {
  const { container } = render(<BackupActions />)
  const input = container.querySelector('input[type="file"]')
  if (!input) throw new Error('file input 없음')
  fireEvent.change(input, { target: { files: [new File([text], 'b.json', { type: 'application/json' })] } })
}
const titles = () => useBucketStore.getState().items.map((i) => i.title)
const backup = serializeBackup({ items: [item('가져옴')], customCategories: ['덕질'] })

test('잘못된 파일이면 오류 문구가 뜨고 스토어는 그대로다', async () => {
  const confirm = vi.spyOn(window, 'confirm')
  pick('{"state":')
  await waitFor(() => expect(screen.getByTestId('backup-message').textContent).toBe('가져올 수 없는 파일이에요'))
  expect(confirm).not.toHaveBeenCalled()
  expect(titles()).toEqual(['지금'])
})

test('confirm에서 취소하면 그대로, 문구도 없다', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  pick(backup)
  await waitFor(() => expect(confirm).toHaveBeenCalledWith('지금 데이터를 가져온 파일로 바꿀까요?'))
  expect(titles()).toEqual(['지금'])
  expect(screen.getByTestId('backup-message').textContent).toBe('')
})

test('confirm에서 확인하면 대체되고 localStorage도 바뀐다', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  pick(backup)
  await waitFor(() => expect(screen.getByTestId('backup-message').textContent).toBe('가져왔어요'))
  expect(titles()).toEqual(['가져옴'])
  expect(useBucketStore.getState().customCategories).toEqual(['덕질'])
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { state: { items: BucketItem[] } }
  expect(saved.state.items.map((i) => i.title)).toEqual(['가져옴'])
})

test('저장값 version이 더 새면 confirm 없이 거부한다', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { items: [], customCategories: [] }, version: 3 }))
  const confirm = vi.spyOn(window, 'confirm')
  pick(backup)
  await waitFor(() => expect(screen.getByTestId('backup-message').textContent).toBe('더 새 버전 앱의 데이터라 가져올 수 없어요'))
  expect(confirm).not.toHaveBeenCalled()
  expect(titles()).toEqual(['지금'])
})

test('내보내기는 날짜 붙은 json 파일로 내려받는다', () => {
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  let name = ''
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    name = this.download
  })
  render(<BackupActions />)
  fireEvent.click(screen.getByRole('button', { name: '데이터 내보내기' }))
  expect(name).toBe(`첫걸음-백업-${DateTime.now().toISODate()}.json`)
})
