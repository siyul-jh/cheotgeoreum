import { describe, expect, it } from 'vitest'
import type { AiDraft, ItemValues } from '../model/schema'
import { draftToPatch } from './draft-to-patch'

const current: ItemValues = {
  title: 't', why: '', category: null, targetPeriod: null, prerequisites: [],
  nextAction: { text: '예약', dueDate: null }, companions: [],
}
const nullDraft: AiDraft = { why: null, category: null, targetPeriod: null, prerequisites: null, nextAction: null }

describe('draftToPatch', () => {
  it('prerequisites를 done:false 객체로 변환', () => {
    expect(draftToPatch('prerequisites', { ...nullDraft, prerequisites: ['a', 'b'] }, current)).toEqual({
      prerequisites: [{ text: 'a', done: false }, { text: 'b', done: false }],
    })
  })
  it('nextAction text null이면 현재 text 유지', () => {
    const draft = { ...nullDraft, nextAction: { text: null, dueDate: '2026-11-03' } }
    expect(draftToPatch('nextAction', draft, current)).toEqual({
      nextAction: { text: '예약', dueDate: '2026-11-03' },
    })
  })
  it('해당 초안이 null이면 null', () => {
    expect(draftToPatch('why', nullDraft, current)).toBeNull()
    expect(draftToPatch('nextAction', nullDraft, current)).toBeNull()
  })
  it('nextAction 두 값 모두 null이면 null', () => {
    const draft = { ...nullDraft, nextAction: { text: null, dueDate: null } }
    expect(draftToPatch('nextAction', draft, current)).toBeNull()
  })
})
