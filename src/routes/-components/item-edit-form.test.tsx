import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore, type BucketItemInput } from '@/entities/bucket-item'
import type { DraftState } from '@/shared/lib/llm-result'
import { routeTree } from '@/routeTree.gen'

const fill = vi.hoisted(() => ({ state: { status: 'idle', draft: null, error: null } as DraftState, request: vi.fn() }))
vi.mock('@/features/ai-fill', () => ({ useFillBlanks: () => ({ ...fill.state, request: fill.request }) }))

const base: BucketItemInput = {
  title: '오로라 보기',
  why: '',
  category: null,
  targetPeriod: null,
  prerequisites: [{ text: '여권', done: false }],
  nextAction: { text: '', dueDate: null },
  status: '아이디어',
  companions: [],
}
let id = ''
beforeEach(() => {
  fill.state = { status: 'idle', draft: null, error: null }
  fill.request.mockClear()
  useBucketStore.setState({ items: [], customCategories: [] })
  id = useBucketStore.getState().addItem(base)
})
afterEach(cleanup)

async function open(path = `/items/${id}`) {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) })
  render(<RouterProvider router={router} />)
  await screen.findByText(/항목 편집|항목을 찾을 수 없어요/)
  return router
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const item = () => useBucketStore.getState().items[0]

test('선행 과제를 체크하고 제목을 trim해 저장한다', async () => {
  const router = await open()
  fireEvent.change(screen.getByLabelText('항목'), { target: { value: '  새 제목 ' } })
  fireEvent.click(screen.getByRole('checkbox'))
  click('저장')
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(item()).toMatchObject({ title: '새 제목', prerequisites: [{ text: '여권', done: true }] })
})

test('제목을 비우면 오류가 나고 store는 바뀌지 않는다', async () => {
  await open()
  fireEvent.change(screen.getByLabelText('항목'), { target: { value: '   ' } })
  click('저장')
  await screen.findByRole('alert')
  expect(item().title).toBe('오로라 보기')
})

test('저장된 값이 스키마에 맞지 않아도 편집 화면이 열린다', async () => {
  useBucketStore.setState({ items: [{ ...base, title: '   ', targetPeriod: '내년', id, createdAt: '2026-10-27T00:00:00.000Z' }] })
  await open()
  expect(screen.getByText('항목 편집')).toBeDefined()
  expect((screen.getByLabelText('항목') as HTMLInputElement).value).toBe('   ')
})

test('편집 중 사용자 카테고리가 삭제되면 category null로 저장한다', async () => {
  useBucketStore.getState().addCategory('덕질')
  useBucketStore.getState().updateItem(id, { ...base, category: '덕질' })
  const router = await open()
  act(() => useBucketStore.getState().deleteCategory('덕질'))
  click('저장')
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(item().category).toBeNull()
})

test('삭제는 확인 단계를 거친다', async () => {
  const router = await open()
  click('삭제')
  expect(item()).toBeDefined()
  click('취소')
  click('삭제')
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '삭제' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(useBucketStore.getState().items).toEqual([])
})

test('없는 id면 안내와 목록 링크를 보인다', async () => {
  await open('/items/nope')
  expect(screen.getByRole('link', { name: '목록으로' })).toBeDefined()
})

test('빈 칸 채우기는 비어 있는 칸에만 제안을 보이고 사용하면 반영한다', async () => {
  fill.state = {
    status: 'ready',
    error: null,
    draft: { why: '하늘이 보고 싶어서', category: '여행', targetPeriod: '2027', prerequisites: ['다른 것'], nextAction: null },
  }
  await open()
  click(/빈 칸 채우기/)
  expect(fill.request).toHaveBeenCalledOnce()
  // 선행 과제는 이미 있어 제안이 없다
  expect(screen.queryByText('다른 것')).toBeNull()
  fireEvent.click(screen.getAllByRole('button', { name: '사용' })[0]!)
  expect((screen.getByLabelText('왜') as HTMLTextAreaElement).value).toBe('하늘이 보고 싶어서')
})

test('pending이면 버튼이 비활성화된다', async () => {
  fill.state = { status: 'pending', draft: null, error: null }
  await open()
  expect((screen.getByRole('button', { name: /만드는 중/ }) as HTMLButtonElement).disabled).toBe(true)
})
