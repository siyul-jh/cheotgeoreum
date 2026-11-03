import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { useBucketStore, type BucketItemInput } from '@/entities/bucket-item'
import { hasSeenWelcome } from '@/features/onboarding'
import { routeTree } from '@/routeTree.gen'

afterEach(cleanup)
beforeEach(() => {
  localStorage.clear()
  useBucketStore.setState({ items: [], customCategories: [] })
})

const open = (path = '/') => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) })
  render(<RouterProvider router={router} />)
  return router
}
const next = () => fireEvent.click(screen.getByRole('button', { name: '다음' }))

test('처음 열면 안내가 뜨고, 다섯 단계를 넘겨 [첫 꿈 적기]로 새 꿈 화면에 간다', async () => {
  const router = open()
  for (const title of ['버킷리스트란?', '왜 만들까요?', '어떻게 만들까요?', '이런 꿈을 적어요']) {
    expect(await screen.findByRole('heading', { name: title })).toBeTruthy()
    next()
  }
  expect(screen.getByRole('heading', { name: '모든 꿈은 첫걸음에서 시작돼요' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: '건너뛰기' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '첫 꿈 적기' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/items/new'))
  expect(hasSeenWelcome()).toBe(true)
})

test('[이전]으로 돌아가고, [건너뛰기]면 목록으로 가서 다시 뜨지 않는다', async () => {
  const router = open()
  await screen.findByRole('heading', { name: '버킷리스트란?' })
  expect(screen.queryByRole('button', { name: '이전' })).toBeNull()
  next()
  fireEvent.click(screen.getByRole('button', { name: '이전' }))
  expect(screen.getByRole('heading', { name: '버킷리스트란?' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(await screen.findByRole('heading', { name: '첫걸음', level: 1 })).toBeTruthy()
})

test('이미 꿈이 있으면 안내 없이 목록을 연다', async () => {
  const input: BucketItemInput = {
    title: '오로라 보기', why: '', category: null, targetPeriod: null, prerequisites: [],
    nextAction: { text: '', dueDate: null }, status: '아이디어', companions: [],
  }
  useBucketStore.getState().addItem(input)
  const router = open()
  expect(await screen.findByRole('heading', { name: '첫걸음', level: 1 })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/')
})
