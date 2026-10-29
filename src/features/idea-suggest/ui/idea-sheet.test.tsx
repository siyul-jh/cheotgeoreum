// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { useBucketStore } from '@/entities/bucket-item'
import { IdeaSheet } from './idea-sheet'

// 추천 요청 상태를 테스트가 정한다
const hook = vi.hoisted(() => ({ status: 'idle', ideas: [] as string[], error: null as null, request: () => {} }))
vi.mock('../model/use-suggest-ideas', () => ({ useSuggestIdeas: () => hook }))

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
  Object.assign(hook, { status: 'idle', ideas: [], error: null })
  useBucketStore.setState({ items: [], customCategories: [] })
})
afterEach(cleanup)

function Page({ onPick = vi.fn() }: { onPick?: (t: string, c: string | null) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        열기
      </button>
      <IdeaSheet open={open} onOpenChange={setOpen} onPick={onPick} />
    </>
  )
}

test('찾는 중에 닫으면 진행 상태를 띄우고, 준비되면 [보기]로 다시 연다', () => {
  hook.status = 'pending'
  const { rerender } = render(<Page />)
  fireEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(screen.getByText('아이디어를 찾고 있어요…')).toBeTruthy()

  hook.status = 'ready'
  hook.ideas = ['오로라 보기']
  rerender(<Page />)
  expect(screen.getByText('아이디어가 준비됐어요')).toBeTruthy()
  act(() => fireEvent.click(screen.getByRole('button', { name: '보기' })))
  expect(screen.getByRole('dialog', { name: '아이디어 추천' }).hasAttribute('open')).toBe(true)
  expect(screen.queryByText('아이디어가 준비됐어요')).toBeNull()
})

test('결과를 본 뒤 닫으면 진행 상태를 띄우지 않는다', () => {
  Object.assign(hook, { status: 'ready', ideas: ['오로라 보기'] })
  render(<Page />)
  fireEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(screen.queryByText('아이디어가 준비됐어요')).toBeNull()
})

test('아이디어를 고르면 추천받을 때 고른 카테고리를 함께 넘긴다', () => {
  Object.assign(hook, { status: 'ready', ideas: ['오로라 보기'] })
  const onPick = vi.fn()
  render(<Page onPick={onPick} />)
  fireEvent.change(screen.getByLabelText('카테고리 (선택)'), { target: { value: '여행' } })
  fireEvent.click(screen.getByRole('button', { name: '오로라 보기' }))
  expect(onPick).toHaveBeenCalledWith('오로라 보기', '여행')
})
