import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { useBucketStore, type BucketItemInput } from '@/entities/bucket-item'
import { routeTree } from '@/routeTree.gen'

afterEach(cleanup)
beforeEach(() => useBucketStore.setState({ items: [], customCategories: [] }))

const base: BucketItemInput = {
  title: '오로라 보기', why: '', category: null, targetPeriod: { kind: 'start', at: '2028-02' }, prerequisites: [],
  nextAction: { text: '항공권 검색', dueDate: '2026-11-01' }, status: '아이디어', companions: [],
}

async function open(path = '/') {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) })
  render(<RouterProvider router={router} />)
  await screen.findByRole('heading', { name: '첫걸음', level: 1 })
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
  const icon = () => star.querySelector('svg')!.dataset.status
  expect(star.getAttribute('aria-pressed')).toBe('false')
  expect(icon()).toBe('아이디어')
  fireEvent.click(star)
  expect(useBucketStore.getState().items[0]).toMatchObject({ id, status: '완료', title: '오로라 보기' })
  expect(star.getAttribute('aria-pressed')).toBe('true')
  expect(icon()).toBe('완료')
  fireEvent.click(star)
  expect(useBucketStore.getState().items[0]!.status).toBe('진행 중')
  expect(icon()).toBe('진행 중')
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

test('다음 행동 후보가 없으면 빈 히어로가 다음 행동이 빈 진행 중·계획 항목 편집으로 안내한다', async () => {
  const store = useBucketStore.getState()
  store.addItem({ ...base, nextAction: { text: '', dueDate: null } })
  const id = store.addItem({ ...base, title: '하프 마라톤', status: '계획', nextAction: { text: '', dueDate: null } })
  await open()
  const hero = screen.getByRole('region', { name: '오늘의 첫걸음' })
  expect(hero.textContent).toContain('다음 행동을 정해 보세요')
  expect(within(hero).getByRole('link', { name: '다음 행동 정하기' }).getAttribute('href')).toBe(`/items/${id}`)
})

test('그런 항목도 없으면 빈 히어로는 새 꿈 링크를, 항목이 0개면 히어로 없이 빈 목록 안내만 보인다', async () => {
  useBucketStore.getState().addItem({ ...base, nextAction: { text: '', dueDate: null } })
  await open()
  const hero = screen.getByRole('region', { name: '오늘의 첫걸음' })
  expect(within(hero).getByRole('link', { name: '+ 새 꿈' }).getAttribute('href')).toBe('/items/new')

  act(() => useBucketStore.setState({ items: [] }))
  await waitFor(() => expect(screen.queryByRole('region', { name: '오늘의 첫걸음' })).toBeNull())
  expect(screen.getByText(/아직 띄운 꿈이 없어요/)).toBeTruthy()
})

test('머리줄: 보이는 제목, 이룬 수 요약. 새 꿈 버튼은 footer(휴대폰 고정 · md 이상 플로팅)', async () => {
  const store = useBucketStore.getState()
  store.addItem(base)
  store.addItem({ ...base, status: '완료' })
  store.addItem({ ...base, status: '포기' })
  await open()
  const title = screen.getByRole('heading', { name: '첫걸음', level: 1 })
  expect(title.className).not.toMatch(/sr-only/)
  const header = title.closest('header')!
  expect(header.textContent).toContain('3개 중 1개 이룸')
  expect(within(header).queryByRole('link')).toBeNull()
  const fab = screen.getByRole('link', { name: '+ 새 꿈' })
  expect(fab.getAttribute('href')).toBe('/items/new')
  expect(fab.closest('footer')).not.toBeNull()
  expect(within(screen.getByRole('group', { name: '상태' }).parentElement!).queryByRole('link')).toBeNull()

  act(() => useBucketStore.setState({ items: [] }))
  await waitFor(() => expect(header.textContent).not.toContain('개 이룸'))
})

test('상태 칩은 모든 상태를 한 줄로 고르고, 카테고리 select는 항상 보인다', async () => {
  const router = await open('/?category=__none__')
  const chips = screen.getByRole('group', { name: '상태' })
  const names = Array.from(chips.querySelectorAll('button'), (b) => b.textContent)
  expect(names).toEqual(['전체', '아이디어', '계획', '진행 중', '이룬 꿈', '보류', '포기'])
  const icons = Array.from(chips.querySelectorAll('button'), (b) => b.querySelector('svg')?.dataset.status)
  expect(icons).toEqual([undefined, '아이디어', '계획', '진행 중', '완료', '보류', '포기'])
  expect(screen.queryByRole('combobox', { name: /상태/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '보류' }))
  expect(router.state.location.search).toEqual({ category: '__none__', status: '보류' })
  await waitFor(() => expect(screen.getByRole('button', { name: '보류' }).getAttribute('aria-pressed')).toBe('true'))

  const category = screen.getByRole('combobox', { name: /카테고리/ })
  expect(category.closest('details')).toBeNull()
  fireEvent.change(category, { target: { value: '' } })
  expect(router.state.location.search).toEqual({ status: '보류' })
})
