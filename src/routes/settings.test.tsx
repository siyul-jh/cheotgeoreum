// @vitest-environment jsdom
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore } from '@/entities/bucket-item'
import { routeTree } from '@/routeTree.gen'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
beforeEach(() => {
  localStorage.clear()
  useBucketStore.setState({ items: [], customCategories: [] })
})

async function open() {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/settings'] }) })
  render(<RouterProvider router={router} />)
  await screen.findByRole('heading', { name: '설정', level: 1 })
}

test('화면 모드: 고르면 html[data-theme]과 저장값이 바뀌고, 시스템 설정이면 저장값을 지운다', async () => {
  await open()
  fireEvent.click(screen.getByLabelText('라이트 · 태양'))
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('cheotgeoreum:theme')).toBe('light')

  fireEvent.click(screen.getByLabelText('다크 · 밤하늘'))
  expect(document.documentElement.dataset.theme).toBe('dark')

  fireEvent.click(screen.getByLabelText('시스템 설정'))
  expect(localStorage.getItem('cheotgeoreum:theme')).toBeNull()
  expect((screen.getByLabelText('시스템 설정') as HTMLInputElement).checked).toBe(true)
})

test('내 카테고리: 확인하면 지우고 그 카테고리의 꿈은 미분류가 된다', async () => {
  useBucketStore.getState().addCategory('덕질')
  useBucketStore.getState().addItem({
    title: '콘서트', why: '', category: '덕질', targetPeriod: null, prerequisites: [],
    nextAction: { text: '', dueDate: null }, status: '아이디어', companions: [],
  })
  await open()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: '덕질 삭제' }))
  await waitFor(() => expect(useBucketStore.getState().customCategories).toEqual([]))
  expect(useBucketStore.getState().items[0].category).toBeNull()
  expect(screen.getByText(/직접 만든 카테고리가 없어요/)).toBeTruthy()
})

test('데이터 내보내기·가져오기는 설정에 있다', async () => {
  await open()
  expect(screen.getByRole('button', { name: '데이터 내보내기' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '가져오기' })).toBeTruthy()
})
