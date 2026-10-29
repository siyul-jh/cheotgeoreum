import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { useBucketStore, type BucketItemInput } from '@/entities/bucket-item'
import { routeTree } from '@/routeTree.gen'

afterEach(cleanup)
beforeEach(() => useBucketStore.setState({ items: [], customCategories: [] }))

const base: BucketItemInput = {
  title: '오로라 보기', why: '', category: null, targetPeriod: '2028-02', prerequisites: [],
  nextAction: { text: '항공권 검색', dueDate: '2026-11-01' }, status: '아이디어', companions: [],
}

async function open(path = '/') {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) })
  render(<RouterProvider router={router} />)
  await screen.findByRole('link', { name: '+ 새 꿈' })
  return router
}

test('목록: 빈 안내, 필터 적용, 카드 링크', async () => {
  const router = await open()
  expect(await screen.findByText(/아직 띄운 꿈이 없어요/)).toBeTruthy()

  act(() => {
    useBucketStore.getState().addItem(base)
  })
  const link = await screen.findByRole('link', { name: /오로라 보기/ })
  expect(link.textContent).toContain('미분류 · 아이디어')
  expect(link.textContent).toContain('2028년 2월')
  expect(link.getAttribute('href')).toMatch(/^\/items\//)

  await act(() => router.navigate({ to: '/', search: { status: '완료' } }))
  expect(await screen.findByText('조건에 맞는 꿈이 없어요.')).toBeTruthy()
})

test('빠른 탭은 status search를 바꾸고 카테고리 필터는 유지한다', async () => {
  const router = await open('/?category=__none__')
  fireEvent.click(screen.getByRole('button', { name: '이룬 꿈' }))
  expect(router.state.location.search).toEqual({ category: '__none__', status: '완료' })
  await waitFor(() => expect(screen.getByRole('button', { name: '이룬 꿈' }).getAttribute('aria-pressed')).toBe('true'))
  fireEvent.click(screen.getByRole('button', { name: '전체' }))
  expect(router.state.location.search).toEqual({ category: '__none__' })
})

test('별 버튼은 완료와 진행 중을 오간다', async () => {
  const id = useBucketStore.getState().addItem(base)
  await open()
  const star = screen.getByRole('button', { name: '오로라 보기 이룬 꿈' })
  expect(star.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(star)
  expect(useBucketStore.getState().items[0]).toMatchObject({ id, status: '완료', title: '오로라 보기' })
  expect(star.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(star)
  expect(useBucketStore.getState().items[0]!.status).toBe('진행 중')
})

test('오늘의 첫걸음: 기한 빠른 항목을 보이고 [했어요]면 다음 행동을 비우고 축하한다', async () => {
  const store = useBucketStore.getState()
  store.addItem({ ...base, title: '하프 마라톤', nextAction: { text: '러닝화 사기', dueDate: null } })
  const id = store.addItem(base)
  store.addItem({ ...base, title: '이미 이룬 꿈', status: '완료', nextAction: { text: '안 보임', dueDate: '2026-01-01' } })
  await open()
  const hero = screen.getByRole('region', { name: '오늘의 첫걸음' })
  expect(hero.textContent).toContain('항공권 검색')
  expect(hero.textContent).toContain('오로라 보기')

  fireEvent.click(screen.getByRole('button', { name: '했어요' }))
  expect(useBucketStore.getState().items.find((i) => i.id === id)!.nextAction).toEqual({ text: '', dueDate: null })
  expect(screen.getByRole('status').textContent).toContain('한 걸음 나아갔어요')
  expect(screen.getByRole('link', { name: '다음 행동 정하기' }).getAttribute('href')).toBe(`/items/${id}`)
})

test('다음 행동이 있는 항목이 없으면 오늘의 첫걸음을 숨긴다', async () => {
  useBucketStore.getState().addItem({ ...base, nextAction: { text: '', dueDate: null } })
  await open()
  expect(screen.queryByRole('region', { name: '오늘의 첫걸음' })).toBeNull()
})

test('카테고리·상태 필터는 접지 않고 항상 보인다', async () => {
  const router = await open()
  const category = screen.getByRole('combobox', { name: /카테고리/ })
  const status = screen.getByRole('combobox', { name: /상태/ })
  expect(category.closest('details')).toBeNull()
  expect(status.closest('details')).toBeNull()
  fireEvent.change(status, { target: { value: '완료' } })
  expect(router.state.location.search).toEqual({ status: '완료' })
})
