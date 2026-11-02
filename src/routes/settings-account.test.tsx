// @vitest-environment jsdom
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { routeTree } from '@/routeTree.gen'

const { social, linkSocial, auth } = vi.hoisted(() => ({
  social: vi.fn(),
  linkSocial: vi.fn(),
  auth: { session: null as { user: { id: string; name: string } } | null, providers: [] as string[], pending: false },
}))
vi.mock('@/shared/api/auth-client', () => ({
  authClient: {
    signIn: { social },
    linkSocial,
    useSession: () => ({ data: auth.session, isPending: auth.pending }),
    listAccounts: async () => ({ data: auth.providers.map((providerId) => ({ providerId })) }),
  },
}))

afterEach(() => {
  cleanup()
  social.mockReset()
  linkSocial.mockReset()
  auth.session = null
  auth.providers = []
  auth.pending = false
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
  expect(screen.getByText(/어느 쪽으로 들어와도 같은 계정/)).toBeTruthy()
})

test('세션 확인 중엔 로그인 버튼을 보여 주지 않는다', async () => {
  auth.pending = true
  await open()
  expect(screen.queryByRole('button', { name: '구글로 계속하기' })).toBeNull()
  expect(screen.getByText('확인 중…')).toBeTruthy()
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

test('구글만 연결돼 있으면 카카오 연결 버튼이 나오고, 누르면 지금 계정에 카카오를 묶는다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  auth.providers = ['google']
  await open()
  expect(await screen.findByText('지흠 · 구글 연결됨')).toBeTruthy()
  expect(screen.queryByRole('button', { name: '구글도 연결하기' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '카카오도 연결하기' }))
  expect(linkSocial).toHaveBeenCalledWith({ provider: 'kakao', callbackURL: '/settings', errorCallbackURL: '/settings' })
})

test('둘 다 연결돼 있으면 연결 버튼이 없다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  auth.providers = ['kakao', 'google']
  await open()
  expect(await screen.findByText('지흠 · 구글·카카오 연결됨')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /연결하기/ })).toBeNull()
})

test('연결에 실패해 ?error= 로 돌아오면 이미 쓰는 로그인일 수 있다고 알린다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  auth.providers = ['google']
  await open('/settings?error=account_already_linked_to_different_user')
  expect(screen.getByRole('alert').textContent).toMatch(/이미 다른 계정에서 쓰는 로그인/)
})
