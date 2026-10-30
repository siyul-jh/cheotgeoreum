import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore, type AiDraft, type BucketItemInput } from '@/entities/bucket-item'
import type { DraftState } from '@/shared/lib/llm-result'
import { routeTree } from '@/routeTree.gen'

const fill = vi.hoisted(() => ({ state: { status: 'idle', draft: null, error: null } as DraftState<AiDraft>, request: vi.fn() }))
vi.mock('@/features/ai-fill', () => ({ useFillBlanks: () => ({ ...fill.state, request: fill.request }) }))
// jsdom에는 canvas가 없다. 카드 그리기는 draw-card 단위 테스트가 맡는다
vi.mock('@/features/share-card/lib/draw-card', () => ({ createCardPng: async () => new Blob(['png'], { type: 'image/png' }) }))

const base: BucketItemInput = {
  title: '오로라 보기',
  why: '',
  category: null,
  targetPeriod: null,
  prerequisites: [{ text: '여권', done: false }],
  nextAction: { text: '', dueDate: null },
  status: '아이디어',
  companions: [],
}
let id = ''
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:card')
  URL.revokeObjectURL = vi.fn()
  fill.state = { status: 'idle', draft: null, error: null }
  fill.request.mockClear()
  useBucketStore.setState({ items: [], customCategories: [] })
  id = useBucketStore.getState().addItem(base)
})
afterEach(cleanup)

async function open(path = `/items/${id}`) {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) })
  render(<RouterProvider router={router} />)
  await screen.findByText(/항목 편집|항목을 찾을 수 없어요/)
  return router
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const item = () => useBucketStore.getState().items[0]

test('선행 과제를 체크하고 제목을 trim해 저장한다', async () => {
  const router = await open()
  fireEvent.change(screen.getByLabelText('항목'), { target: { value: '  새 제목 ' } })
  fireEvent.click(screen.getByRole('checkbox'))
  click('저장')
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(item()).toMatchObject({ title: '새 제목', prerequisites: [{ text: '여권', done: true }] })
})

test('제목을 비우면 오류가 나고 store는 바뀌지 않는다', async () => {
  await open()
  fireEvent.change(screen.getByLabelText('항목'), { target: { value: '   ' } })
  click('저장')
  await screen.findByRole('alert')
  expect(item().title).toBe('오로라 보기')
})

test('저장된 값이 스키마에 맞지 않아도 편집 화면이 열린다', async () => {
  useBucketStore.setState({ items: [{ ...base, title: '   ', targetPeriod: { kind: 'start', at: '내년' }, id, createdAt: '2026-10-27T00:00:00.000Z' }] })
  await open()
  expect(screen.getByText('항목 편집')).toBeDefined()
  expect((screen.getByLabelText('항목') as HTMLInputElement).value).toBe('   ')
  expect(screen.queryByText('NaN년')).toBeNull()
})

test('구조가 깨진 항목이면 기본 오류 화면 대신 목록 링크를 보인다', async () => {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { nextAction: _n, ...broken } = base
  useBucketStore.setState({ items: [{ ...broken, id, createdAt: '2026-10-27T00:00:00.000Z' } as never] })
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [`/items/${id}`] }) })
  render(<RouterProvider router={router} />)
  expect(await screen.findByText('이 화면을 열지 못했어요.')).toBeDefined()
  expect(screen.getByRole('link', { name: '목록으로' })).toBeDefined()
  err.mockRestore()
})

test('편집 중 사용자 카테고리가 삭제되면 category null로 저장한다', async () => {
  useBucketStore.getState().addCategory('덕질')
  useBucketStore.getState().updateItem(id, { ...base, category: '덕질' })
  const router = await open()
  act(() => useBucketStore.getState().deleteCategory('덕질'))
  click('저장')
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(item().category).toBeNull()
})

test('삭제는 확인 단계를 거친다', async () => {
  const router = await open()
  click('삭제')
  expect(item()).toBeDefined()
  click('취소')
  click('삭제')
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '삭제' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(useBucketStore.getState().items).toEqual([])
})

test('없는 id면 안내와 목록 링크를 보인다', async () => {
  await open('/items/nope')
  expect(screen.getByRole('link', { name: '목록으로' })).toBeDefined()
})

test('빈 칸 채우기는 비어 있는 칸에만 제안을 보이고 사용하면 반영한다', async () => {
  fill.state = {
    status: 'ready',
    error: null,
    draft: { why: '하늘이 보고 싶어서', category: '여행', targetPeriod: { kind: 'end', at: '2027' }, prerequisites: ['다른 것'], nextAction: null },
  }
  await open()
  click(/빈 칸 채우기/)
  expect(fill.request).toHaveBeenCalledOnce()
  // 선행 과제는 이미 있어 제안이 없다
  expect(screen.queryByText('다른 것')).toBeNull()
  expect(screen.getByText('2027년까지')).toBeDefined()
  fireEvent.click(screen.getAllByRole('button', { name: '사용' })[0]!)
  expect((screen.getByLabelText('왜') as HTMLTextAreaElement).value).toBe('하늘이 보고 싶어서')
})

test('pending이면 버튼이 비활성화된다', async () => {
  fill.state = { status: 'pending', draft: null, error: null }
  await open()
  expect(screen.getByText('AI가 빈 칸을 채우고 있어요…').closest('[role="status"]')).not.toBeNull()
  expect((screen.getByRole('button', { name: '빈 칸 채우기 (AI)' }) as HTMLButtonElement).disabled).toBe(true)
})

test('그룹마다 라벨은 하나, 추가 입력칸에는 예시가 있고 저장 바는 하단에 고정된다', async () => {
  useBucketStore.getState().updateItem(id, { ...base, companions: ['엄마'] })
  await open()
  expect(screen.getAllByText('다음 행동')).toHaveLength(1)
  expect(screen.getAllByText('목표 시기')).toHaveLength(1)
  expect(screen.queryByText('연도')).toBeNull()
  const period = screen.getByRole('group', { name: '목표 시기' })
  expect(within(period).getByLabelText('연도')).toBeDefined()
  for (const name of ['새 카테고리 이름', '선행 과제', '함께할 사람 이름', '할 일']) {
    expect((screen.getByLabelText(name) as HTMLInputElement).placeholder).not.toBe('')
  }
  expect(screen.getByRole('button', { name: '엄마 삭제' }).className).not.toMatch(/\bbtn\b/)
  expect(screen.getByRole('button', { name: '여권 삭제' }).className).not.toMatch(/\bbtn\b/)
  expect(screen.getByRole('button', { name: '저장' }).closest('.sticky')).not.toBeNull()
})

test('편집 폼은 한 열에서 구역 카드로 묶는다', async () => {
  await open()
  const card = (el: HTMLElement) => el.closest('.surface')
  const basics = card(screen.getByLabelText('항목'))
  expect(basics).not.toBeNull()
  expect(card(screen.getByLabelText('왜'))).toBe(basics)
  const plan = card(screen.getByRole('group', { name: '카테고리' }))
  expect(plan).not.toBe(basics)
  expect(card(screen.getByLabelText('상태'))).toBe(plan)
  expect(card(screen.getByRole('group', { name: '목표 시기' }))).toBe(plan)
  const prep = card(screen.getByRole('group', { name: '선행 과제' }))
  expect(prep).not.toBe(plan)
  expect(card(screen.getByRole('group', { name: '다음 행동' }))).toBe(prep)
  const people = card(screen.getByRole('group', { name: '함께할 사람' }))
  expect(people).not.toBeNull()
  expect(people).not.toBe(prep)
})

test('상태 선택지 앞에 상태 아이콘이 붙고 이름은 글자 그대로다', async () => {
  await open()
  const options = Array.from((screen.getByLabelText('상태') as HTMLSelectElement).options)
  expect(options.map((o) => o.querySelector('svg')?.dataset.status)).toEqual(options.map((o) => o.value))
  expect(options.map((o) => o.text)).toEqual(options.map((o) => o.value))
})

// AC-T1·AC-T3: 편집 화면은 저장된 종류를 보이고, 덜 채운 기간은 저장하지 않는다
test('이때까지를 기간으로 바꾸면 그 시점이 끝이 되고, 시작을 골라야 저장된다', async () => {
  const y = new Date().getFullYear()
  useBucketStore.getState().updateItem(id, { ...base, targetPeriod: { kind: 'end', at: `${y + 1}-02` } })
  const router = await open()
  expect((screen.getByRole('radio', { name: '이때까지' }) as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByRole('radio', { name: '기간' }))
  expect((screen.getByLabelText('끝 연도') as HTMLSelectElement).value).toBe(String(y + 1))
  click('저장')
  await waitFor(() => expect(screen.getAllByRole('alert').map((a) => a.textContent)).toContain('시작을 골라 주세요'))
  expect(item().targetPeriod).toEqual({ kind: 'end', at: `${y + 1}-02` })

  fireEvent.change(screen.getByLabelText('시작 연도'), { target: { value: String(y) } })
  click('저장')
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(item().targetPeriod).toEqual({ kind: 'range', from: String(y), to: `${y + 1}-02` })
})

test('편집 화면에서도 저장된 내용의 별 카드를 보고 링크로 공유·이미지로 저장할 수 있다', async () => {
  const share = vi.fn(async (data: ShareData) => void data)
  Object.assign(navigator, { share })
  await open()
  const section = screen.getByRole('region', { name: '별 카드' })
  expect(within(section).getByRole('figure', { name: '오로라 보기 별 카드' }).textContent).toContain('여권')
  const save = within(section).getByRole('button', { name: '이미지로 저장' }) as HTMLButtonElement
  await waitFor(() => expect(save.disabled).toBe(false))
  const button = within(section).getByRole('button', { name: '공유하기' }) as HTMLButtonElement
  await waitFor(() => expect(button.disabled).toBe(false))
  fireEvent.click(button)
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
  expect(share.mock.calls[0][0].url).toMatch(/\/s#1\./)
  expect(share.mock.calls[0][0].text).toBe('내 버킷리스트에 새 별이 떴어요 ✦ 오로라 보기')
  Reflect.deleteProperty(navigator, 'share')
})
