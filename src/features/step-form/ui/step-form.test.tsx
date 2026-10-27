import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useReducer } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { create } from 'zustand'
import { useBucketStore, type AiDraft } from '@/entities/bucket-item'
import type { DraftState } from '@/shared/lib/llm-result'
import { initialStepFormState, stepFormReducer } from '../model/step-form-reducer'
import { StepForm } from './step-form'

const idle: DraftState = { status: 'idle', draft: null, error: null }

// 초안 상태를 바깥에서 바꿔도 StepForm이 리마운트되지 않도록 store로 주입한다
const useDraftState = create<DraftState>(() => idle)

function Harness({ onFill }: { onFill: () => void }) {
  const [state, dispatch] = useReducer(stepFormReducer, initialStepFormState)
  const draftState = useDraftState()
  return (
    <StepForm state={state} dispatch={dispatch} draftState={draftState} onFill={onFill} onOpenIdeas={vi.fn()} onSave={vi.fn()} saveError={null} />
  )
}

// StepForm의 닫기(Link)가 라우터 컨텍스트를 요구한다
async function renderForm(draftState: DraftState, onFill: () => void = vi.fn()) {
  useDraftState.setState(draftState, true)
  const rootRoute = createRootRoute({ component: () => <Harness onFill={onFill} /> })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  render(<RouterProvider router={router} />)
  await screen.findByText('어떤 일을 해보고 싶나요?')
  return { rerender: (ds: DraftState) => act(() => useDraftState.setState(ds, true)) }
}

const next = () => fireEvent.click(screen.getByRole('button', { name: '다음' }))

beforeEach(() => useBucketStore.setState({ items: [], customCategories: [] }))
afterEach(cleanup)

test('제목 Enter → why 단계, 제목 카드가 아래에 생기고 누르면 title 단계가 다시 열린다', async () => {
  await renderForm(idle)
  const title = screen.getByLabelText('어떤 일을 해보고 싶나요?')
  fireEvent.change(title, { target: { value: '오로라 보기' } })
  fireEvent.keyDown(title, { key: 'Enter', isComposing: true })
  expect(screen.queryByText('왜 하고 싶나요?')).toBeNull()

  fireEvent.keyDown(title, { key: 'Enter' })
  expect(screen.getByText('왜 하고 싶나요?')).toBeTruthy()
  expect(screen.getByText('2 / 7')).toBeTruthy()
  const card = screen.getByRole('button', { name: /항목\s*오로라 보기/ })

  fireEvent.click(card)
  expect((screen.getByLabelText('어떤 일을 해보고 싶나요?') as HTMLInputElement).value).toBe('오로라 보기')
  expect(screen.queryByRole('button', { name: /항목\s*오로라 보기/ })).toBeNull()
})

test('입력 중 초안이 도착해도 입력값 유지, [사용]은 입력만 채운다', async () => {
  const { rerender } = await renderForm(idle)
  fireEvent.change(screen.getByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '오로라 보기' } })
  next()
  const why = screen.getByLabelText('왜 하고 싶나요?') as HTMLTextAreaElement
  fireEvent.change(why, { target: { value: '직접 쓴 이유' } })

  const draft: AiDraft = { why: '하늘을 직접 보고 싶어서', category: null, targetPeriod: null, prerequisites: null, nextAction: null }
  rerender({ status: 'ready', draft, error: null })
  expect((screen.getByLabelText('왜 하고 싶나요?') as HTMLTextAreaElement).value).toBe('직접 쓴 이유')
  expect(screen.getByText('하늘을 직접 보고 싶어서')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: '사용' }))
  expect((screen.getByLabelText('왜 하고 싶나요?') as HTMLTextAreaElement).value).toBe('하늘을 직접 보고 싶어서')
  expect(screen.getByText('왜 하고 싶나요?')).toBeTruthy()
})

test('AI 오류 상태에서도 입력·진행 가능 (AC5)', async () => {
  const onFill = vi.fn()
  await renderForm({ status: 'error', draft: null, error: 'llm_unreachable' }, onFill)
  fireEvent.change(screen.getByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '하프 마라톤 완주' } })
  next()
  expect(screen.getByRole('alert').textContent).toContain('AI 서버에 연결하지 못했어요')
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(onFill).toHaveBeenCalledOnce()

  fireEvent.change(screen.getByLabelText('왜 하고 싶나요?'), { target: { value: '체력' } })
  next()
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }))
  expect(screen.getByText('이렇게 저장할까요?')).toBeTruthy()
  expect(screen.getByRole('button', { name: /왜\s*체력/ })).toBeTruthy()
})

test("'빈 칸 채우기'는 제목 결정 후 보이고 pending 중에는 비활성", async () => {
  const onFill = vi.fn()
  const { rerender } = await renderForm(idle, onFill)
  expect(screen.queryByRole('button', { name: /빈 칸 채우기/ })).toBeNull()
  fireEvent.change(screen.getByLabelText('어떤 일을 해보고 싶나요?'), { target: { value: '오로라 보기' } })
  next()
  fireEvent.click(screen.getByRole('button', { name: /빈 칸 채우기/ }))
  expect(onFill).toHaveBeenCalledOnce()

  rerender({ status: 'pending', draft: null, error: null })
  expect((screen.getByRole('button', { name: 'AI 초안 만드는 중…' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByLabelText('왜 하고 싶나요?') as HTMLTextAreaElement).disabled).toBe(false)
})
