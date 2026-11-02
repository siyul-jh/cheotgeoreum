// @vitest-environment jsdom
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { routeTree } from '@/routeTree.gen'

const { social } = vi.hoisted(() => ({ social: vi.fn() }))
vi.mock('@/shared/api/auth-client', () => ({
  authClient: { signIn: { social }, useSession: () => ({ data: null, isPending: false }) },
}))

afterEach(() => {
  cleanup()
  social.mockReset()
})

async function open(url = '/settings') {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [url] }) })
  render(<RouterProvider router={router} />)
  await screen.findByRole('heading', { name: '계정' })
}

test('로그인 전 설정 계정 섹션: 버튼마다 해당 provider로 로그인하고 설정으로 돌아온다', async () => {
  await open()
  fireEvent.click(screen.getByRole('button', { name: '구글로 계속하기' }))
  expect(social).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/settings', errorCallbackURL: '/settings' })
  fireEvent.click(screen.getByRole('button', { name: '카카오로 계속하기' }))
  expect(social).toHaveBeenCalledWith({ provider: 'kakao', callbackURL: '/settings', errorCallbackURL: '/settings' })
  expect(screen.getByText(/구글과 카카오는 별개 계정/)).toBeTruthy()
})

test('이용약관·개인정보처리방침 링크가 있다', async () => {
  await open()
  expect(screen.getByRole('link', { name: '이용약관' }).getAttribute('href')).toBe('/terms')
  expect(screen.getByRole('link', { name: '개인정보처리방침' }).getAttribute('href')).toBe('/privacy')
})

test('?error= 로 돌아오면 안내 문구를 보여 준다', async () => {
  await open('/settings?error=email_not_found')
  expect(screen.getByRole('alert').textContent).toMatch(/로그인하지 못했어요/)
})

test('?error= 가 없으면 안내 문구가 없다', async () => {
  await open()
  expect(screen.queryByRole('alert')).toBeNull()
})
