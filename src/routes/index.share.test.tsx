import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore, type BucketItemInput } from '@/entities/bucket-item'
import { decodeShared } from '@/features/share-card/lib/share-link'
import { markWelcomeSeen } from '@/features/onboarding'
import { routeTree } from '@/routeTree.gen'

// jsdom에는 dialog의 showModal·close가 없다
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
beforeEach(() => {
  useBucketStore.setState({ items: [], customCategories: [] })
  markWelcomeSeen() // 처음 안내는 welcome.test가 맡는다
})
afterEach(() => {
  cleanup()
  Reflect.deleteProperty(navigator, 'share')
})

const base: BucketItemInput = {
  title: '오로라 보기', why: '', category: '여행', targetPeriod: null, prerequisites: [],
  nextAction: { text: '', dueDate: null }, status: '계획', companions: [],
}

test('목록 공유: 지금 보이는 꿈이 체크된 채 열리고, 고른 꿈만 목록 링크로 공유한다', async () => {
  const store = useBucketStore.getState()
  store.addItem(base)
  store.addItem({ ...base, title: '하프 마라톤', category: '건강' })
  store.addItem({ ...base, title: '책 100권', category: '배움' })
  const share = vi.fn(async (data: ShareData) => void data)
  Object.assign(navigator, { share })
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/?category=여행'] }) })
  render(<RouterProvider router={router} />)

  fireEvent.click(await screen.findByRole('button', { name: '목록 공유' }))
  const sheet = screen.getByRole('dialog', { name: '목록 공유' })
  const boxes = within(sheet).getAllByRole('checkbox') as HTMLInputElement[]
  expect(boxes.map((b) => b.checked)).toEqual([true, false, false])
  fireEvent.click(within(sheet).getByLabelText('책 100권'))

  const send = within(sheet).getByRole('button', { name: '2개 공유' })
  await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(send)
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
  const data = share.mock.calls[0][0]
  expect(data.text).toBe('내 버킷리스트를 나눠요 ✦\n꿈 2개')
  const shared = await decodeShared(data.url!.split('#')[1])
  expect(shared.kind === 'list' && shared.items.map((i) => i.title)).toEqual(['오로라 보기', '책 100권'])
})

test('꿈이 없으면 목록 공유 버튼이 없고, 모두 해제하면 공유할 수 없다', async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }) })
  render(<RouterProvider router={router} />)
  await screen.findByRole('heading', { name: '첫걸음', level: 1 })
  expect(screen.queryByRole('button', { name: '목록 공유' })).toBeNull()

  useBucketStore.getState().addItem(base)
  fireEvent.click(await screen.findByRole('button', { name: '목록 공유' }))
  const sheet = screen.getByRole('dialog', { name: '목록 공유' })
  fireEvent.click(within(sheet).getByRole('button', { name: '모두 해제' }))
  expect((within(sheet).getByRole('button', { name: '꿈을 골라 주세요' }) as HTMLButtonElement).disabled).toBe(true)
})
