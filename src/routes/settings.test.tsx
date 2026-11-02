// @vitest-environment jsdom
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

test('내 카테고리: 설정에서 추가하고, 이름을 바꾸면 그 카테고리의 꿈도 바뀐다', async () => {
  useBucketStore.getState().addItem({
    title: '콘서트', why: '', category: null, targetPeriod: null, prerequisites: [],
    nextAction: { text: '', dueDate: null }, status: '아이디어', companions: [],
  })
  await open()
  fireEvent.change(screen.getByLabelText('새 카테고리 이름'), { target: { value: '덕질' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(useBucketStore.getState().customCategories).toEqual(['덕질'])
  act(() => useBucketStore.setState((st) => ({ items: st.items.map((i) => ({ ...i, category: '덕질' })) })))

  fireEvent.click(await screen.findByRole('button', { name: '덕질 이름 바꾸기' }))
  fireEvent.change(screen.getByLabelText('덕질 새 이름'), { target: { value: '여행' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  expect(screen.getByRole('alert').textContent).toContain('이미 있거나')
  fireEvent.change(screen.getByLabelText('덕질 새 이름'), { target: { value: '공연' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  expect(useBucketStore.getState().customCategories).toEqual(['공연'])
  expect(useBucketStore.getState().items[0].category).toBe('공연')
  expect(screen.getByRole('button', { name: '공연 이름 바꾸기' })).toBeTruthy()
})

test('데이터 내보내기·가져오기는 설정에 있다', async () => {
  await open()
  expect(screen.getByRole('button', { name: '데이터 내보내기' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '가져오기' })).toBeTruthy()
})
