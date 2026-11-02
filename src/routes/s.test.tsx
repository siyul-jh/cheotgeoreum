import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { encodeCard, encodeList } from '@/features/share-card/lib/share-link'
import { routeTree } from '@/routeTree.gen'

// jsdom에는 canvas가 없다. 카드 그리기는 draw-card 단위 테스트가 맡는다
vi.mock('@/features/share-card/lib/draw-card', () => ({ createCardPng: async () => new Blob(['png'], { type: 'image/png' }) }))

// 짧은 링크는 서버 저장소에서 내용을 받아온다
const shortLinks = vi.hoisted(() => new Map<string, string>())
vi.mock('@/features/share-card/api/short-link', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/share-card/api/short-link')>()
  const { decodeShared } = await import('@/features/share-card/lib/share-link')
  return {
    ...original,
    openShared: async (hash: string) => {
      if (!original.SHORT_ID.test(hash)) return decodeShared(hash)
      const payload = shortLinks.get(hash)
      if (!payload) throw new Error('없음')
      return decodeShared(payload)
    },
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function open(entry: string) {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [entry] }) })
  render(<RouterProvider router={router} />)
}

test('받은 링크를 빈 저장소에서 열면 카드가 보이고 아무것도 저장하지 않는다', async () => {
  localStorage.clear()
  const setItem = vi.spyOn(Storage.prototype, 'setItem')
  const hash = await encodeCard({
    title: '오로라 보기',
    why: '하늘이 보고 싶어서',
    category: '여행',
    targetPeriod: null,
    prerequisites: [],
    nextAction: { text: '', dueDate: null },
    companions: [],
  })
  await open(`/s#${hash}`)
  const card = await screen.findByRole('figure')
  expect(within(card).getByText('오로라 보기')).toBeTruthy()
  expect(setItem).toHaveBeenCalledTimes(0)
  expect(screen.getByRole('link', { name: '나도 적어보기' }).getAttribute('href')).toBe('/items/new')

  // 받은 사람도 이미지로 저장할 수 있다
  URL.createObjectURL = vi.fn(() => 'blob:card')
  URL.revokeObjectURL = vi.fn()
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const save = screen.getByRole('button', { name: '이미지로 저장' }) as HTMLButtonElement
  await waitFor(() => expect(save.disabled).toBe(false))
  fireEvent.click(save)
  expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('첫걸음-오로라 보기.png')
})

test.each([
  ['hash가 없으면', '/s'],
  ['hash가 변조되면', '/s#1.AAAA-not-a-card'],
])('%s 열 수 없다고 알리고 나도 적어보기를 둔다', async (_name, entry) => {
  await open(entry)
  expect(await screen.findByText('카드를 열 수 없어요')).toBeTruthy()
  expect(screen.getByRole('link', { name: '나도 적어보기' }).getAttribute('href')).toBe('/items/new')
})

test('짧은 링크(# 뒤 10글자 id)는 저장된 내용으로 카드를 연다', async () => {
  const payload = await encodeCard({
    title: '제주 걷기',
    why: '',
    category: null,
    targetPeriod: null,
    prerequisites: [],
    nextAction: { text: '', dueDate: null },
    companions: [],
  })
  shortLinks.set('Ab3dE9fG2h', payload)
  await open('/s#Ab3dE9fG2h')
  expect(within(await screen.findByRole('figure')).getByText('제주 걷기')).toBeTruthy()
})

test('없거나 만료된 짧은 링크는 열 수 없다고 알린다', async () => {
  await open('/s#zzzzzzzzzz')
  expect((await screen.findByRole('alert')).textContent).toBe('카드를 열 수 없어요')
})

test('목록 짧은 링크는 받은 버킷리스트로 열고, 이룬 꿈을 표시하며 저장하지 않는다', async () => {
  localStorage.clear()
  const setItem = vi.spyOn(Storage.prototype, 'setItem')
  const base = { why: '', prerequisites: [], nextAction: { text: '', dueDate: null }, companions: [], createdAt: '' }
  shortLinks.set(
    'L1st000000',
    await encodeList([
      { ...base, id: 'a', title: '오로라 보기', category: '여행', targetPeriod: { kind: 'start', at: '2027-03' }, status: '완료' },
      { ...base, id: 'b', title: '하프 마라톤', category: null, targetPeriod: null, status: '계획' },
    ]),
  )
  await open('/s#L1st000000')
  expect(await screen.findByRole('heading', { name: '받은 버킷리스트' })).toBeTruthy()
  expect(screen.getByText('2개 중 1개 이룸')).toBeTruthy()
  const rows = screen.getAllByRole('listitem')
  expect(rows[0].textContent).toContain('오로라 보기 (이룬 꿈)')
  expect(rows[0].textContent).toContain('여행 · 2027년 3월쯤')
  expect(rows[1].textContent).toContain('미분류')
  expect(screen.getByRole('link', { name: '나도 적어보기' })).toBeTruthy()
  expect(setItem.mock.calls.filter(([key]) => key === 'cheotgeoreum:v1')).toEqual([])
})
