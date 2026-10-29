import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore, type AiDraft, type BlankField } from '@/entities/bucket-item'
import { fillBlanks } from '@/features/ai-fill/api/fill-blanks'
import type { LlmResult } from '@/shared/lib/llm-result'
import { routeTree } from '@/routeTree.gen'

// 요청마다 응답을 테스트가 정한 때 돌려준다
const pending: { blankFields: BlankField[]; resolve: (r: LlmResult<AiDraft>) => void }[] = []
vi.mock('@/features/ai-fill/api/fill-blanks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/ai-fill/api/fill-blanks')>()),
  fillBlanks: vi.fn(
    ({ data }: { data: { blankFields: BlankField[] } }) =>
      new Promise<LlmResult<AiDraft>>((resolve) => pending.push({ blankFields: data.blankFields, resolve })),
  ),
}))

const nul: AiDraft = { why: null, category: null, targetPeriod: null, prerequisites: null, nextAction: null }
beforeEach(() => {
  pending.length = 0
  vi.mocked(fillBlanks).mockClear()
  useBucketStore.setState({ items: [], customCategories: [] })
})
afterEach(cleanup)

test('지금 단계 칸을 먼저 따로 요청하고, 나머지 칸은 뒤에서 만들어 다음 단계에서 보인다', async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/items/new'] }) })
  render(<RouterProvider router={router} />)
  fireEvent.change(await screen.findByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '오로라 보기' } })
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  fireEvent.click(screen.getByRole('button', { name: '빈 칸 채우기 (AI)' }))

  await vi.waitFor(() => expect(pending).toHaveLength(2))
  expect(pending.map((p) => p.blankFields)).toEqual([
    ['why'],
    ['category', 'targetPeriod', 'prerequisites', 'nextActionText', 'nextActionDueDate'],
  ])

  await act(async () => pending[0].resolve({ ok: true, data: { ...nul, why: '하늘이 보고 싶어서' } }))
  expect(await screen.findByText('하늘이 보고 싶어서')).toBeTruthy()

  // 다음 단계: 뒤의 요청이 아직이면 만드는 중으로 보인다
  fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }))
  expect((screen.getByRole('button', { name: 'AI 초안 만드는 중…' }) as HTMLButtonElement).disabled).toBe(true)
  await act(async () => pending[1].resolve({ ok: true, data: { ...nul, category: '여행' } }))
  expect((await screen.findByRole('button', { name: '사용' })).parentElement?.textContent).toContain('AI 제안: 여행')
})
