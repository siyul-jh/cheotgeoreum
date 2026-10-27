import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { useBucketStore } from '@/entities/bucket-item'
import { routeTree } from '@/routeTree.gen'

afterEach(cleanup)

test('목록: 빈 안내, 필터 적용, 카드 링크', async () => {
  useBucketStore.setState({ items: [], customCategories: [] })
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }) })
  render(<RouterProvider router={router} />)
  expect(await screen.findByText(/아직 항목이 없어요/)).toBeTruthy()

  act(() => {
    useBucketStore.getState().addItem({
      title: '오로라 보기', why: '', category: null, targetPeriod: '2028-02', prerequisites: [],
      nextAction: { text: '항공권 검색', dueDate: '2026-11-01' }, status: '아이디어', companions: [],
    })
  })
  const link = await screen.findByRole('link', { name: /오로라 보기/ })
  expect(link.textContent).toContain('미분류 · 아이디어')
  expect(link.textContent).toContain('2028년 2월')
  expect(link.getAttribute('href')).toMatch(/^\/items\//)

  await act(() => router.navigate({ to: '/', search: { status: '완료' } }))
  expect(await screen.findByText('조건에 맞는 항목이 없어요.')).toBeTruthy()
})
