import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { sendFeatureRequest } from '../api/feature-requests'
import { FeatureRequestForm } from './feature-request-form'

afterEach(cleanup)

const renderForm = (submit: unknown) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FeatureRequestForm submit={submit as typeof sendFeatureRequest} />
    </QueryClientProvider>,
  )

function fill() {
  fireEvent.change(screen.getByLabelText('어떤 기능이 있으면 좋을까요?'), { target: { value: '알림' } })
  fireEvent.change(screen.getByLabelText('자세히 알려 주세요'), { target: { value: '매일 아침' } })
  fireEvent.click(screen.getByRole('button', { name: '요청 보내기' }))
}

test('보내면 입력한 제목·내용을 넘기고, 성공하면 이슈 링크를 보여 준다', async () => {
  const submit = vi.fn(async () => ({ ok: true, url: 'https://github.com/x/1' }) as const)
  renderForm(submit)
  fill()
  expect((await screen.findByRole('link', { name: '보낸 요청 보기(GitHub)' })).getAttribute('href')).toBe('https://github.com/x/1')
  expect(submit).toHaveBeenCalledWith({ data: { title: '알림', body: '매일 아침' } })
})

test('실패하면 오류 문구를 보여 주고 쓴 글은 그대로 둔다', async () => {
  const submit = vi.fn(async () => ({ ok: false, code: 'rate' }) as const)
  renderForm(submit)
  fill()
  expect((await screen.findByRole('alert')).textContent).toContain('한 시간 뒤에')
  expect((screen.getByLabelText('자세히 알려 주세요') as HTMLTextAreaElement).value).toBe('매일 아침')
})
