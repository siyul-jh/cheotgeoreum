import { describe, expect, it } from 'vitest'
import type { AiDraft, ItemValues } from '../model/schema'
import { draftToPatch } from './draft-to-patch'

const current: ItemValues = {
  title: 't', why: '', category: null, targetPeriod: null, prerequisites: [],
  nextAction: { text: '예약', dueDate: null }, companions: [],
}
const nullDraft: AiDraft = { why: null, category: null, targetPeriod: null, prerequisites: null, nextAction: null }

describe('draftToPatch', () => {
  it('targetPeriod는 종류 그대로 교체', () => {
    const targetPeriod = { kind: 'range', from: '2027', to: '2028' } as const
    expect(draftToPatch('targetPeriod', { ...nullDraft, targetPeriod }, current)).toEqual({ targetPeriod })
    expect(draftToPatch('targetPeriod', nullDraft, current)).toBeNull()
  })
  it('prerequisites를 done:false 객체로 변환', () => {
    expect(draftToPatch('prerequisites', { ...nullDraft, prerequisites: ['a', 'b'] }, current)).toEqual({
      prerequisites: [{ text: 'a', done: false }, { text: 'b', done: false }],
    })
  })
  it('prerequisites는 현재 목록 뒤에 덧붙이고 같은 text는 뺀다', () => {
    const withList: ItemValues = { ...current, prerequisites: [{ text: 'a', done: true }] }
    expect(draftToPatch('prerequisites', { ...nullDraft, prerequisites: ['a', 'b'] }, withList)).toEqual({
      prerequisites: [{ text: 'a', done: true }, { text: 'b', done: false }],
    })
    expect(draftToPatch('prerequisites', { ...nullDraft, prerequisites: ['a'] }, withList)).toBeNull()
  })
  it('스칼라는 현재 값이 있어도 교체', () => {
    expect(draftToPatch('why', { ...nullDraft, why: '새 이유' }, { ...current, why: '쓴 이유' })).toEqual({ why: '새 이유' })
  })
  it('nextAction은 비어 있는 하위 칸만 채운다', () => {
    const draft = { ...nullDraft, nextAction: { text: '다른 행동', dueDate: '2026-11-03' } }
    expect(draftToPatch('nextAction', draft, current)).toEqual({
      nextAction: { text: '예약', dueDate: '2026-11-03' },
    })
    const filled: ItemValues = { ...current, nextAction: { text: '예약', dueDate: '2026-11-01' } }
    expect(draftToPatch('nextAction', draft, filled)).toBeNull()
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
  it('prerequisites 초안 안의 중복도 한 번만 덧붙인다', () => {
    const draft = { ...nullDraft, prerequisites: ['여권', '여권'] }
    const empty: ItemValues = { ...current, prerequisites: [] }
    expect(draftToPatch('prerequisites', draft, empty)?.prerequisites).toEqual([{ text: '여권', done: false }])
  })
  it('prerequisites 덧붙이기는 30개 상한을 넘기지 않는다', () => {
    const full: ItemValues = {
      ...current,
      prerequisites: Array.from({ length: 28 }, (_, i) => ({ text: `과제${i}`, done: false })),
    }
    const draft = { ...nullDraft, prerequisites: ['a', 'b', 'c'] }
    expect(draftToPatch('prerequisites', draft, full)?.prerequisites).toHaveLength(30)
  })
})
