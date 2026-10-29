import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore } from '@/entities/bucket-item'
import { createCardPng } from '@/features/share-card/lib/draw-card'
import { routeTree } from '@/routeTree.gen'

// jsdom에는 canvas가 없다. 카드 그리기는 draw-card 단위 테스트가 맡는다
vi.mock('@/features/share-card/lib/draw-card', () => ({
  createCardPng: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}))

beforeEach(() => {
  useBucketStore.setState({ items: [], customCategories: [] })
  URL.createObjectURL = vi.fn(() => 'blob:card')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  for (const key of ['canShare', 'share', 'clipboard']) Reflect.deleteProperty(navigator, key)
})

async function open() {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/items/new'] }) })
  render(<RouterProvider router={router} />)
  await screen.findByText('어떤 일을 해보고 싶나요?')
  return router
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
// [공유하기]는 카드가 준비된 뒤에 켜진다
async function shareButton() {
  const button = screen.getByRole('button', { name: '공유하기' }) as HTMLButtonElement
  await waitFor(() => expect(button.disabled).toBe(false))
  return button
}

test('AI 없이 7단계를 진행해 저장하고 [목록으로]로 목록에 간다', async () => {
  const router = await open()
  fireEvent.change(screen.getByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '  오로라 보기 ' } })
  click('다음')
  fireEvent.change(screen.getByLabelText('왜 하고 싶나요?'), { target: { value: '하늘이 보고 싶어서' } })
  click('다음')
  click('여행')
  click('다음')
  for (let i = 0; i < 4; i++) click('건너뛰기')
  click('저장')
  fireEvent.click(await screen.findByRole('link', { name: '목록으로' }))

  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  const [item] = useBucketStore.getState().items
  expect(item).toMatchObject({ title: '오로라 보기', why: '하늘이 보고 싶어서', category: '여행', status: '아이디어' })
})

// AC-T1·AC-T3: 기간은 시작이 있고 순서가 맞아야 다음으로 간다(끝은 비워도 된다). 저장하면 목록 카드에 같은 표시
test('목표 시기를 기간으로 정해 저장하면 목록 카드에 기간으로 보인다', async () => {
  const y = new Date().getFullYear()
  const router = await open()
  fireEvent.change(screen.getByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '세계 일주' } })
  click('다음')
  click('건너뛰기')
  click('건너뛰기')
  expect(screen.getByText('언제쯤 해보고 싶나요?')).toBeTruthy()
  fireEvent.click(screen.getByRole('radio', { name: '기간' }))
  fireEvent.change(screen.getByLabelText('시작 연도'), { target: { value: String(y + 1) } })
  const nextButton = () => screen.getByRole('button', { name: '다음' }) as HTMLButtonElement
  // 끝은 비워도 된다(…부터)
  expect(nextButton().disabled).toBe(false)
  expect(screen.queryByRole('alert')).toBeNull()
  fireEvent.change(screen.getByLabelText('끝 연도'), { target: { value: String(y) } })
  expect(nextButton().disabled).toBe(true)
  expect(screen.getByRole('alert').textContent).toBe('끝이 시작보다 빨라요')
  fireEvent.change(screen.getByLabelText('끝 연도'), { target: { value: String(y + 2) } })
  expect(nextButton().disabled).toBe(false)
  click('다음')
  expect(screen.getByRole('button', { name: new RegExp(`목표 시기\\s*${y + 1}년 ~ ${y + 2}년`) })).toBeTruthy()
  for (let i = 0; i < 3; i++) click('건너뛰기')
  click('저장')
  fireEvent.click(await screen.findByRole('link', { name: '목록으로' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(useBucketStore.getState().items[0].targetPeriod).toEqual({ kind: 'range', from: String(y + 1), to: String(y + 2) })
  expect(screen.getByRole('link', { name: /세계 일주/ }).textContent).toContain(`${y + 1}년 ~ ${y + 2}년`)
})

test('공백 제목이면 [다음] 비활성, Enter로도 진행하지 않는다', async () => {
  await open()
  const title = screen.getByLabelText('어떤 일을 해보고 싶나요?')
  fireEvent.change(title, { target: { value: '   ' } })
  expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.keyDown(title, { key: 'Enter' })
  expect(screen.getByText('어떤 일을 해보고 싶나요?')).toBeTruthy()
  expect(screen.queryByText('왜 하고 싶나요?')).toBeNull()
})

async function saveTitleOnly(title = '오로라 보기') {
  const router = await open()
  fireEvent.change(screen.getByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: title } })
  click('다음')
  for (let i = 0; i < 6; i++) click('건너뛰기')
  click('저장')
  return router
}

test('저장하면 "새 별이 떴어요"에 머물고 스스로 목록으로 가지 않는다', async () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-reduced-motion: no-preference)' }))
  const router = await saveTitleOnly()
  expect(screen.getByText('새 별이 떴어요')).toBeTruthy()
  expect(useBucketStore.getState().items).toHaveLength(1)
  await new Promise((r) => setTimeout(r, 1500))
  expect(router.state.location.pathname).toBe('/items/new')
  expect(screen.getByRole('button', { name: '공유하기' })).toBeTruthy()
  expect(screen.getByRole('link', { name: '목록으로' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '하나 더 적기' })).toBeTruthy()
})

test('축하 화면은 제목에 포커스를 두고 공유될 카드 이미지를 미리 보여 준다', async () => {
  await saveTitleOnly()
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: '새 별이 떴어요', level: 1 }))
  const img = await screen.findByRole('img', { name: '오로라 보기 별 카드' })
  expect(img.getAttribute('src')).toBe('blob:card')
})

test('모션 축소 환경에서도 축하 화면과 버튼이 보인다', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  const router = await saveTitleOnly()
  expect(screen.getByText('새 별이 떴어요')).toBeTruthy()
  expect(screen.getByRole('button', { name: '공유하기' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/items/new')
})

test('[하나 더 적기]는 빈 작성 화면 1단계로 돌아간다', async () => {
  await saveTitleOnly()
  click('하나 더 적기')
  const title = screen.getByLabelText('어떤 일을 해보고 싶나요?') as HTMLInputElement
  expect(title.value).toBe('')
  expect(screen.queryByText('새 별이 떴어요')).toBeNull()
  expect(screen.queryByText('정한 칸 · 누르면 고칠 수 있어요')).toBeNull()
  expect(useBucketStore.getState().items).toHaveLength(1)
})

test('[공유하기]는 공유 시트를 여는 동안 비활성이다', async () => {
  let finish = () => {}
  const share = vi.fn((data: ShareData) => new Promise<void>((resolve) => (finish = () => resolve(void data))))
  Object.assign(navigator, { canShare: () => true, share })
  await saveTitleOnly()
  const button = await shareButton()
  fireEvent.click(button)
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
  expect(button.disabled).toBe(true)
  expect(share.mock.calls[0][0].text).toBe('내 버킷리스트에 새 별이 떴어요 ✦ 오로라 보기')
  finish()
  await waitFor(() => expect(button.disabled).toBe(false))
})

test('공유 시트를 닫으면 오류 문구가 없다', async () => {
  Object.assign(navigator, { canShare: () => true, share: () => Promise.reject(new DOMException('cancel', 'AbortError')) })
  await saveTitleOnly()
  const button = await shareButton()
  fireEvent.click(button)
  await waitFor(() => expect(button.disabled).toBe(false))
  expect(screen.queryByText(/이미지를|못했어요/)).toBeNull()
})

test('카드를 만들지 못하면 [공유하기]는 꺼진 채 이유를 보인다', async () => {
  vi.mocked(createCardPng).mockRejectedValueOnce(new Error('canvas'))
  await saveTitleOnly()
  expect(await screen.findByText('이미지를 만들지 못했어요')).toBeTruthy()
  expect((screen.getByRole('button', { name: '공유하기' }) as HTMLButtonElement).disabled).toBe(true)
})

test('공유 시트를 못 쓰면 PNG를 저장하고 문구를 복사했다고 알린다', async () => {
  const writeText = vi.fn(async (text: string) => void text)
  Object.assign(navigator, { clipboard: { writeText } })
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await saveTitleOnly()
  const button = await shareButton()
  button.focus()
  fireEvent.click(button)
  expect(await screen.findByText('이미지를 저장하고 문구를 복사했어요')).toBeTruthy()
  expect(download).toHaveBeenCalledTimes(1)
  expect(writeText).toHaveBeenCalledWith('내 버킷리스트에 새 별이 떴어요 ✦ 오로라 보기')
  expect(document.activeElement).toBe(button) // 안내가 바뀌어도 포커스를 제목으로 빼앗지 않는다
})
