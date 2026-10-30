import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore } from '@/entities/bucket-item'
import { routeTree } from '@/routeTree.gen'

const request = vi.fn()
const reset = vi.fn()
vi.mock('@/features/ai-fill', () => ({
  useFillBlanks: () => ({ status: 'idle', draft: null, error: null, request, reset }),
}))
vi.mock('@/features/idea-suggest', () => ({
  IdeaSheet: ({ open, onPick }: { open: boolean; onPick: (t: string, c: string | null) => void }) =>
    open && (
      <button type="button" onClick={() => onPick('오로라 보기', '여행')}>
        고르기
      </button>
    ),
}))

beforeEach(() => {
  request.mockClear()
  reset.mockClear()
  useBucketStore.setState({ items: [], customCategories: [] })
})
afterEach(cleanup)

test('아이디어를 고르면 제목이 정해져 2단계로 가고, 곧바로 빈 칸 채우기를 요청한다', async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/items/new'] }) })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: '뭘 적을지 모르겠어요' }))
  fireEvent.click(screen.getByRole('button', { name: '고르기' }))

  await screen.findByText('왜 하고 싶나요?')
  expect(screen.queryByRole('button', { name: '고르기' })).toBeNull()
  expect(screen.getByText('오로라 보기')).toBeTruthy()
  // 지금 단계(왜) 칸을 먼저, 나머지 칸은 따로 요청한다
  expect(request).toHaveBeenCalledTimes(2)
  const [first, rest] = request.mock.calls.map(([input]) => input as { item: { title: string }; blankFields: string[] })
  expect(first.item.title).toBe('오로라 보기')
  expect(first.blankFields).toEqual(['why'])
  expect(rest.blankFields).not.toContain('why')
})

test('추천받을 때 고른 카테고리는 카테고리 단계에 미리 골라져 있다', async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/items/new'] }) })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: '뭘 적을지 모르겠어요' }))
  fireEvent.click(screen.getByRole('button', { name: '고르기' }))
  await screen.findByText('왜 하고 싶나요?')
  fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }))
  expect(screen.getByRole('button', { name: '여행' }).getAttribute('aria-pressed')).toBe('true')
})

test('결정한 제목이 바뀌면 이전 초안을 버린다', async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/items/new'] }) })
  render(<RouterProvider router={router} />)
  const title = () => screen.getByLabelText('어떤 일을 해보고 싶나요?')
  fireEvent.change(await screen.findByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '오로라 보기' } })
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  reset.mockClear()

  fireEvent.click(screen.getByRole('button', { name: /항목\s*오로라 보기/ }))
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(reset).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: /항목\s*오로라 보기/ }))
  fireEvent.change(title(), { target: { value: '하프 마라톤' } })
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(reset).toHaveBeenCalledTimes(2) // 지금 단계 요청·뒤에서 만드는 요청 둘 다
})
