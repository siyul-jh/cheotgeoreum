import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore } from '@/entities/bucket-item'
import { routeTree } from '@/routeTree.gen'

const request = vi.fn()
vi.mock('@/features/ai-fill', () => ({
  useFillBlanks: () => ({ status: 'idle', draft: null, error: null, request }),
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
  useBucketStore.setState({ items: [], customCategories: [] })
})
afterEach(cleanup)

test('아이디어를 고르면 제목이 정해지고 초안을 자동 요청하며 2단계로 간다', async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/items/new'] }) })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: '뭘 적을지 모르겠어요' }))
  fireEvent.click(screen.getByRole('button', { name: '고르기' }))

  await screen.findByText('왜 하고 싶나요?')
  expect(screen.queryByRole('button', { name: '고르기' })).toBeNull()
  expect(screen.getByText('오로라 보기')).toBeTruthy()
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
  expect(request.mock.calls[0][0]).toMatchObject({
    item: { title: '오로라 보기' },
    blankFields: ['why', 'category', 'targetPeriod', 'prerequisites', 'nextActionText', 'nextActionDueDate'],
  })
})
