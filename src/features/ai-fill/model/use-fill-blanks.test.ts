import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/entities/bucket-item'
import { deriveDraftState } from './use-fill-blanks'

const draft: AiDraft = { why: '이유', category: null, targetPeriod: null, prerequisites: null, nextAction: null }
const base = { isPending: false, isError: false, data: undefined, invalidInput: false }

describe('deriveDraftState', () => {
  it('아무 요청도 없으면 idle', () => {
    expect(deriveDraftState(base)).toEqual({ status: 'idle', draft: null, error: null })
  })
  it('pending이면 pending', () => {
    expect(deriveDraftState({ ...base, isPending: true })).toEqual({ status: 'pending', draft: null, error: null })
  })
  it('ok면 ready와 draft', () => {
    expect(deriveDraftState({ ...base, data: { ok: true, data: draft } })).toEqual({ status: 'ready', draft, error: null })
  })
  it('ok가 아니면 error와 해당 code', () => {
    expect(deriveDraftState({ ...base, data: { ok: false, code: 'timeout' } })).toEqual({
      status: 'error',
      draft: null,
      error: 'timeout',
    })
  })
  it('isError면 llm_unreachable', () => {
    expect(deriveDraftState({ ...base, isError: true })).toEqual({ status: 'error', draft: null, error: 'llm_unreachable' })
  })
  it('invalidInput이면 invalid_input', () => {
    expect(deriveDraftState({ ...base, invalidInput: true })).toEqual({ status: 'error', draft: null, error: 'invalid_input' })
  })
})
