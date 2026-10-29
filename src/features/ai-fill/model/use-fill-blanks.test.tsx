// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, test, vi } from 'vitest'
import { fillBlanks } from '../api/fill-blanks'
import { useFillBlanks } from './use-fill-blanks'

vi.mock('../api/fill-blanks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/fill-blanks')>()),
  fillBlanks: vi.fn(() => new Promise(() => {})),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
)

// 덜 채운 기간 하나 때문에 요청 전체가 입력 오류가 되면 안 된다
test('시작 없는 기간은 비운 채 요청한다', async () => {
  const { result } = renderHook(() => useFillBlanks(), { wrapper })
  const item = {
    title: '세계 일주',
    why: '',
    category: null,
    targetPeriod: { kind: 'range', from: null, to: '2030' } as const,
    prerequisites: [],
    nextAction: { text: '', dueDate: null },
  }
  act(() => result.current.request({ item, blankFields: ['why'], categories: ['여행'] }))
  expect(result.current.error).not.toBe('invalid_input')
  await waitFor(() => expect(fillBlanks).toHaveBeenCalledTimes(1))
  expect(vi.mocked(fillBlanks).mock.calls[0][0]?.data.item.targetPeriod).toBeNull()
})
