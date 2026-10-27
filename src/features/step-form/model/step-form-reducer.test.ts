import { describe, expect, it } from 'vitest'
import {
  STEP_ORDER,
  initialStepFormState,
  stepFormReducer,
  toBucketItemInput,
  undecidedAiFields,
  type StepFormAction,
  type StepFormState,
} from './step-form-reducer'

const run = (actions: StepFormAction[], from: StepFormState = initialStepFormState) => actions.reduce(stepFormReducer, from)
const titled = run([{ type: 'decide', field: 'title', patch: { title: '오로라 보기' } }])

describe('stepFormReducer', () => {
  it('순서대로 진행하고 다 정하면 current는 null', () => {
    expect(titled.current).toBe('why')
    const done = run(
      STEP_ORDER.slice(1).map((field) => ({ type: 'decide', field, patch: {} }) as const),
      titled,
    )
    expect(done.decided).toEqual([...STEP_ORDER])
    expect(done.current).toBeNull()
  })

  it('skip하면 값이 빈 채로 다음 단계로 간다', () => {
    const s = run([{ type: 'skip', field: 'why' }], titled)
    expect(s.current).toBe('category')
    expect(s.values.why).toBe('')
    expect(s.decided).toEqual(['title', 'why'])
  })

  it('다시 연 칸을 skip하면 값을 비운다', () => {
    const s = run(
      [
        { type: 'decide', field: 'why', patch: { why: '보고 싶어서' } },
        { type: 'reopen', field: 'why' },
        { type: 'skip', field: 'why' },
      ],
      titled,
    )
    expect(s.values.why).toBe('')
  })

  it('reopen 후 decide하면 다음 미결정 단계로, 남은 게 없으면 null', () => {
    const s = run([{ type: 'skip', field: 'why' }, { type: 'reopen', field: 'title' }], titled)
    expect(s.current).toBe('title')
    expect(s.decided).toEqual(['why'])
    expect(run([{ type: 'decide', field: 'title', patch: { title: '새 제목' } }], s).current).toBe('category')

    const all = run(STEP_ORDER.slice(1).map((field) => ({ type: 'skip', field }) as const), titled)
    const reopened = run([{ type: 'reopen', field: 'category' }], all)
    expect(reopened.current).toBe('category')
    expect(run([{ type: 'decide', field: 'category', patch: { category: '여행' } }], reopened).current).toBeNull()
  })

  it('reopen의 patch는 값만 반영하고 결정 처리하지 않는다', () => {
    const s = run([{ type: 'reopen', field: 'title', patch: { why: '쓰던 이유' } }], titled)
    expect(s.values.why).toBe('쓰던 이유')
    expect(s.decided).toEqual([])
    expect(s.current).toBe('title')
  })

  it('title skip은 무시한다', () => {
    expect(stepFormReducer(initialStepFormState, { type: 'skip', field: 'title' })).toBe(initialStepFormState)
  })
})

describe('toBucketItemInput', () => {
  it("status는 '아이디어'", () => {
    expect(toBucketItemInput(titled, ['여행']).status).toBe('아이디어')
  })
  it('목록에 없는 category는 null', () => {
    const s = run([{ type: 'decide', field: 'category', patch: { category: '독서' } }], titled)
    expect(toBucketItemInput(s, ['여행', '독서']).category).toBe('독서')
    expect(toBucketItemInput(s, ['여행']).category).toBeNull()
  })
})

describe('undecidedAiFields', () => {
  it('title만 결정됐으면 6개 BlankField 전부', () => {
    expect(undecidedAiFields(titled)).toEqual([
      'why',
      'category',
      'targetPeriod',
      'prerequisites',
      'nextActionText',
      'nextActionDueDate',
    ])
  })
  it('why와 nextAction이 결정됐으면 둘을 빼고, companions는 절대 없다', () => {
    const s = run(
      [
        { type: 'decide', field: 'why', patch: { why: '이유' } },
        { type: 'decide', field: 'nextAction', patch: { nextAction: { text: '검색', dueDate: null } } },
      ],
      titled,
    )
    expect(undecidedAiFields(s)).toEqual(['category', 'targetPeriod', 'prerequisites'])
    expect(undecidedAiFields(initialStepFormState)).not.toContain('companions')
  })
  it('다시 연 칸에 값이 있으면 보내지 않는다', () => {
    const s = run(
      [
        { type: 'decide', field: 'why', patch: { why: '이유' } },
        { type: 'decide', field: 'nextAction', patch: { nextAction: { text: '검색', dueDate: null } } },
        { type: 'reopen', field: 'why' },
        { type: 'reopen', field: 'nextAction' },
      ],
      titled,
    )
    expect(undecidedAiFields(s)).toEqual(['category', 'targetPeriod', 'prerequisites', 'nextActionDueDate'])
  })
})
