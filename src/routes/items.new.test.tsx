import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { useBucketStore } from '@/entities/bucket-item'
import { routeTree } from '@/routeTree.gen'

beforeEach(() => useBucketStore.setState({ items: [], customCategories: [] }))
afterEach(cleanup)

async function open() {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/items/new'] }) })
  render(<RouterProvider router={router} />)
  await screen.findByText('어떤 일을 해보고 싶나요?')
  return router
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))

test('AI 없이 7단계를 진행해 저장하면 목록으로 간다', async () => {
  const router = await open()
  fireEvent.change(screen.getByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '  오로라 보기 ' } })
  click('다음')
  fireEvent.change(screen.getByLabelText('왜 하고 싶나요?'), { target: { value: '하늘이 보고 싶어서' } })
  click('다음')
  click('여행')
  click('다음')
  for (let i = 0; i < 4; i++) click('건너뛰기')
  click('저장')

  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  const [item] = useBucketStore.getState().items
  expect(item).toMatchObject({ title: '오로라 보기', why: '하늘이 보고 싶어서', category: '여행', status: '아이디어' })
})

test('safeParse가 실패하면 오류 문구를 보이고 저장하지 않는다', async () => {
  const router = await open()
  fireEvent.change(screen.getByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '   ' } })
  click('다음')
  for (let i = 0; i < 6; i++) click('건너뛰기')
  click('저장')

  expect(screen.getByRole('alert').textContent).toContain('저장하지 못했어요')
  expect(useBucketStore.getState().items).toEqual([])
  expect(router.state.location.pathname).toBe('/items/new')
})
