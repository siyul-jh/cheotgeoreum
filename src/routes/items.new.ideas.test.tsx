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
  IdeaSheet: ({ onPick }: { onPick: (t: string) => void }) => (
    <button type="button" onClick={() => onPick('오로라 보기')}>
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

test('아이디어를 고르면 제목만 정해지고 AI 초안은 요청하지 않으며 2단계로 간다', async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/items/new'] }) })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: '뭘 적을지 모르겠어요' }))
  fireEvent.click(screen.getByRole('button', { name: '고르기' }))

  await screen.findByText('왜 하고 싶나요?')
  expect(screen.queryByRole('button', { name: '고르기' })).toBeNull()
  expect(screen.getByText('오로라 보기')).toBeTruthy()
  expect(request).not.toHaveBeenCalled()
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
  expect(reset).toHaveBeenCalledOnce()
})
