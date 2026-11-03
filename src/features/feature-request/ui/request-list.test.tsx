import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import type { RequestSummary } from '../api/feature-requests'
import { RequestList } from './request-list'

afterEach(cleanup)

const renderList = (load: () => Promise<RequestSummary[]>) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RequestList load={load} />
    </QueryClientProvider>,
  )

test('요청마다 제목 링크·상태·내용·날짜·댓글 수를 보여 준다', async () => {
  renderList(async () => [
    { number: 3, title: '알림', body: '매일 아침', status: 'done', url: 'https://github.com/x/3', createdAt: '2026-11-03T00:00:00Z', comments: 2 },
  ])
  expect((await screen.findByRole('link', { name: '알림' })).getAttribute('href')).toBe('https://github.com/x/3')
  expect(screen.getByText('만들었어요')).toBeTruthy()
  expect(screen.getByText('매일 아침')).toBeTruthy()
  expect(screen.getByText('2026.11.03 · 댓글 2')).toBeTruthy()
})

test('요청이 없으면 첫 요청을 권한다', async () => {
  renderList(async () => [])
  expect(await screen.findByText('아직 요청이 없어요. 첫 요청을 남겨 주세요.')).toBeTruthy()
})

test('불러오지 못하면 다시 시도 버튼을 준다', async () => {
  renderList(async () => {
    throw new Error('github 500')
  })
  expect(await screen.findByRole('button', { name: '다시 시도' })).toBeTruthy()
})
