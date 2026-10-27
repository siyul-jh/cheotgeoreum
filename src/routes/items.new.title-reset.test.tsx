import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useBucketStore, type AiDraft } from '@/entities/bucket-item'
import type { DraftState } from '@/shared/lib/llm-result'
import { routeTree } from '@/routeTree.gen'

const nul: AiDraft = { why: null, category: null, targetPeriod: null, prerequisites: null, nextAction: null }
const h = vi.hoisted(() => ({ reset: vi.fn() }))
const useDraft = vi.hoisted(() => ({ store: null as unknown as UseBoundStore<StoreApi<DraftState<AiDraft>>> }))
vi.mock('@/features/ai-fill', async () => {
  const { create } = await import('zustand')
  useDraft.store = create<DraftState<AiDraft>>(() => ({ status: 'idle', draft: null, error: null }))
  return {
    useFillBlanks: () => {
      const s = useDraft.store()
      return {
        ...s,
        request: vi.fn(),
        reset: () => {
          h.reset()
          useDraft.store.setState({ status: 'idle', draft: null, error: null }, true)
        },
      }
    },
  }
})

beforeEach(() => {
  h.reset.mockClear()
  useBucketStore.setState({ items: [], customCategories: [] })
})
afterEach(cleanup)

test('제목을 다시 열어 바꾼 뒤 다른 카드로 떠나도 이전 제목의 초안을 버린다', async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/items/new'] }) })
  render(<RouterProvider router={router} />)
  const title = await screen.findByLabelText('어떤 일을 해보고 싶나요?')
  fireEvent.change(title, { target: { value: '오로라 보기' } })
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  act(() => useDraft.store.setState({ status: 'ready', error: null, draft: { ...nul, why: '오로라를 보고 싶어서', category: '여행' } }, true))
  // why 건너뛰기 → category 단계
  fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }))
  // 제목 카드 다시 열고 바꾼 뒤, [다음] 대신 '왜' 카드 클릭
  fireEvent.click(screen.getByRole('button', { name: /항목\s*오로라 보기/ }))
  fireEvent.change(screen.getByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '하프 마라톤' } })
  fireEvent.click(screen.getByRole('button', { name: /^왜/ }))
  expect(screen.queryByText('오로라를 보고 싶어서')).toBeNull()
  expect(h.reset).toHaveBeenCalled()
  expect(useDraft.store.getState().status).toBe('idle')
})
