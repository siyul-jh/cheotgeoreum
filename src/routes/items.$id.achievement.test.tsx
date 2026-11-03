import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { useBucketStore, type BucketItemInput } from '@/entities/bucket-item'
import { routeTree } from '@/routeTree.gen'

afterEach(cleanup)
beforeEach(() => {
  localStorage.clear()
  useBucketStore.setState({ items: [], customCategories: [] })
})

const input = (over: Partial<BucketItemInput> = {}): BucketItemInput => ({
  title: '오로라 보기',
  why: '',
  category: null,
  targetPeriod: null,
  prerequisites: [],
  nextAction: { text: '', dueDate: null },
  status: '완료',
  companions: [],
  ...over,
})
const open = (id: string) =>
  render(<RouterProvider router={createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [`/items/${id}`] }) })} />)

test('이룬 꿈이면 이룬 날과 한 줄 소감을 적어 저장한다', async () => {
  const id = useBucketStore.getState().addItem(input())
  open(id)
  expect(await screen.findByRole('heading', { name: '이룬 기록' })).toBeTruthy()
  expect(screen.getByText(/년 .*월 .*일에 이뤘어요\./)).toBeTruthy()
  fireEvent.change(screen.getByRole('textbox', { name: '한 줄 소감' }), { target: { value: '  평생 기억날 밤  ' } })
  fireEvent.click(screen.getByRole('button', { name: '소감 저장' }))
  expect(useBucketStore.getState().items[0]!.reflection).toBe('평생 기억날 밤')
  expect(screen.getByText('저장했어요.')).toBeTruthy()
})

test('아직 이루지 않은 꿈에는 기록 칸이 없다', async () => {
  const id = useBucketStore.getState().addItem(input({ status: '진행 중' }))
  open(id)
  expect(await screen.findByRole('heading', { name: '항목 편집' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: '이룬 기록' })).toBeNull()
})
