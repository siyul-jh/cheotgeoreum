// @vitest-environment jsdom
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore, type BucketItemInput } from '@/entities/bucket-item'
import { useSyncStatus } from '@/features/dream-sync'
import { routeTree } from '@/routeTree.gen'

const { social, linkSocial, signOut, refetch, deleteAccountFn, syncDreams, auth } = vi.hoisted(() => ({
  syncDreams: vi.fn(),
  social: vi.fn(),
  linkSocial: vi.fn(),
  signOut: vi.fn(),
  refetch: vi.fn(),
  deleteAccountFn: vi.fn(),
  auth: { session: null as { user: { id: string; name: string } } | null, providers: [] as string[], pending: false },
}))
vi.mock('@/shared/api/auth-client', () => ({
  authClient: {
    signIn: { social },
    linkSocial,
    signOut,
    useSession: () => ({ data: auth.session, isPending: auth.pending, refetch }),
    listAccounts: async () => ({ data: auth.providers.map((providerId) => ({ providerId })) }),
  },
}))

vi.mock('@/features/auth/api/delete-account', () => ({ deleteAccountFn }))
vi.mock('@/features/dream-sync/api/sync-dreams', () => ({ syncDreams }))

const dream: BucketItemInput = {
  title: '오로라 보기', why: '', category: null, targetPeriod: null, prerequisites: [], nextAction: { text: '', dueDate: null },
  status: '아이디어', companions: [],
}
const okSync = async () => ({
  ackedDeleted: [],
  rejected: [],
  snapshot: { items: useBucketStore.getState().items, deleted: [], categories: [], nextCursor: null, serverNow: new Date().toISOString() },
})

beforeEach(() => {
  useBucketStore.setState({ items: [], customCategories: [], categoryLog: [], deletedIds: [], ownerId: null })
  useSyncStatus.setState({ status: 'idle', held: null, lastAt: 0, rejected: 0 })
  syncDreams.mockImplementation(okSync)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  for (const fn of [social, linkSocial, signOut, refetch, deleteAccountFn, syncDreams]) fn.mockReset()
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

test('로그아웃: 이 기기 꿈의 주인이면 먼저 올려 보고 signOut. 꿈은 그대로 남는다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  useBucketStore.getState().addItem(dream)
  useBucketStore.getState().claimLocalData('u1')
  await open()
  syncDreams.mockClear()
  fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
  expect(syncDreams).toHaveBeenCalled()
  expect(useBucketStore.getState().items).toHaveLength(1)
})

test('로그아웃: 마지막 동기화가 실패하면 묻고, 취소하면 로그아웃하지 않는다', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  auth.session = { user: { id: 'u1', name: '지흠' } }
  useBucketStore.getState().claimLocalData('u1')
  await open()
  syncDreams.mockRejectedValue(new Error('offline'))
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
  await waitFor(() => expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/올라가지 않은 변경/)))
  expect(signOut).not.toHaveBeenCalled()
})

test('연결 직후: 이 기기에 꿈이 있으면 옮길지 묻고, [옮기기]면 계정 것이 되어 동기화한다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  useBucketStore.getState().addItem(dream)
  await open()
  expect(syncDreams).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '옮기기' }))
  expect(useBucketStore.getState().ownerId).toBe('u1')
  await waitFor(() => expect(syncDreams).toHaveBeenCalled())
  expect(await screen.findByText('다른 기기와 꿈을 맞춰 두고 있어요.')).toBeTruthy()
})

test('연결 직후: 어느 계정 것도 아닌 빈 기기는 묻지 않고 잇고, 남은 내 카테고리는 지우지 않는다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  useBucketStore.getState().addCategory('덕질')
  await open()
  await waitFor(() => expect(useBucketStore.getState().ownerId).toBe('u1'))
  expect(useBucketStore.getState().customCategories).toEqual(['덕질'])
  expect(screen.queryByRole('button', { name: '옮기기' })).toBeNull()
})

test('다른 계정 표시만 남은 빈 기기(꿈·지운 흔적 없음)는 비우고 이 계정으로 잇는다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  useBucketStore.getState().claimLocalData('deleted-account')
  await open()
  await waitFor(() => expect(useBucketStore.getState().ownerId).toBe('u1'))
})

test('다른 계정의 꿈이 있는 기기: 올리지 않고 묻는다. 백업 파일을 받은 뒤에야 지울 수 있다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  useBucketStore.getState().deleteItem(useBucketStore.getState().addItem(dream))
  useBucketStore.getState().addItem(dream)
  useBucketStore.getState().claimLocalData('someone-else')
  await open()
  expect(screen.getByRole('alert').textContent).toMatch(/다른 계정의 꿈 1개와 아직 올라가지 않은 삭제 1개/)
  expect(syncDreams).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: /지우기/ })).toBeNull()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  fireEvent.click(screen.getByRole('button', { name: '백업 파일 받기' }))
  expect(click).toHaveBeenCalledTimes(1)
  expect(useBucketStore.getState().items).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: '백업을 확인했어요, 지우기' }))
  expect(useBucketStore.getState().items).toEqual([])
  expect(useBucketStore.getState().ownerId).toBe('u1')
})

test('서버가 받지 않은 꿈이 있으면 이 기기에만 있다고 알린다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  useBucketStore.getState().addItem(dream)
  useBucketStore.getState().claimLocalData('u1')
  syncDreams.mockImplementation(async () => ({ ...(await okSync()), rejected: [{ id: 'x', reason: 'limit' }] }))
  await open()
  expect(await screen.findByText(/꿈 1개는 계정에 올라가지 못해/)).toBeTruthy()
})

test('동기화를 멈췄으면 사라질 꿈 수를 알리고, [그래도 적용]하면 계정 상태를 적용한다', async () => {
  auth.session = { user: { id: 'u1', name: '지흠' } }
  const id = useBucketStore.getState().addItem(dream)
  useBucketStore.getState().claimLocalData('u1')
  syncDreams.mockImplementation(() => new Promise(() => {})) // 켤 때 동기화는 끝나지 않게
  useSyncStatus.setState({
    status: 'held',
    held: {
      snapshot: { items: [], deleted: [{ id, deletedAt: '2999-01-01T00:00:00.000Z' }], categories: [], serverNow: '2999-01-01T00:00:00.000Z' },
      acked: [],
      key: id,
    },
  })
  await open()
  expect(screen.getByRole('alert').textContent).toContain('이 기기의 꿈 1개가 사라져요')
  fireEvent.click(screen.getByRole('button', { name: '그래도 적용' }))
  expect(useBucketStore.getState().items).toEqual([])
  expect(useSyncStatus.getState().status).toBe('idle')
})
