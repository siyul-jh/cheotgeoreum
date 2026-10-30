import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { encodeCard } from '@/features/share-card/lib/share-link'
import { routeTree } from '@/routeTree.gen'

// jsdom에는 canvas가 없다. 카드 그리기는 draw-card 단위 테스트가 맡는다
vi.mock('@/features/share-card/lib/draw-card', () => ({ createCardPng: async () => new Blob(['png'], { type: 'image/png' }) }))

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
