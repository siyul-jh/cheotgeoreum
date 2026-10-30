import {
  AI_FIELDS,
  type BlankField,
  getBlankFields,
  type BucketItemInput,
  type ItemField,
  type ItemValues,
} from '@/entities/bucket-item'

export const STEP_ORDER = [
  'title',
  'why',
  'category',
  'targetPeriod',
  'prerequisites',
  'nextAction',
  'companions',
] as const satisfies readonly ItemField[]

// current === null 이면 확인 화면. reopened: 지금 단계가 정한 칸을 다시 연 것인지
export type StepFormState = { values: ItemValues; decided: ItemField[]; current: ItemField | null; reopened: boolean }
export type StepFormAction =
  | { type: 'decide'; field: ItemField; patch: Partial<ItemValues> }
  | { type: 'skip'; field: ItemField }
  | { type: 'reopen'; field: ItemField; patch?: Partial<ItemValues> } // patch: 떠나는 단계의 입력(결정 처리 없음)

export const initialStepFormState: StepFormState = {
  values: {
    title: '',
    why: '',
    category: null,
    targetPeriod: null,
    prerequisites: [],
    nextAction: { text: '', dueDate: null },
    companions: [],
  },
  decided: [],
  current: 'title',
  reopened: false,
}

function settle(values: ItemValues, decided: ItemField[], field: ItemField): StepFormState {
  const next = decided.includes(field) ? decided : [...decided, field]
  return { values, decided: next, current: STEP_ORDER.find((f) => !next.includes(f)) ?? null, reopened: false }
}

export function stepFormReducer(state: StepFormState, action: StepFormAction): StepFormState {
  switch (action.type) {
    case 'decide':
      return settle({ ...state.values, ...action.patch }, state.decided, action.field)
    case 'skip':
      if (action.field === 'title') return state
      return settle(
        { ...state.values, [action.field]: initialStepFormState.values[action.field] },
        state.decided,
        action.field,
      )
    case 'reopen': {
      const values = { ...state.values, ...action.patch }
      // 다시 연 칸에서 [다음] 없이 다른 카드로 옮기면 그 칸은 정한 채로 둔다. 안 그러면 [다음]이 그 칸부터 다시 묻는다
      // 단, 제목을 비운 채 떠나면 제목 단계로 돌아와야 하니 미정으로 둔다
      const keep = state.reopened && state.current !== null && !(state.current === 'title' && values.title.trim() === '')
      const decided = keep && state.current !== null ? [...state.decided, state.current] : state.decided
      return { values, decided: decided.filter((f) => f !== action.field), current: action.field, reopened: true }
    }
  }
}

// 결정하지 않았고 값도 비어 있는 칸만. 다시 연 칸에 값이 있으면 맥락으로 보낸다(AC2)
export function undecidedAiFields(state: StepFormState): BlankField[] {
  const blanks = getBlankFields(state.values)
  return AI_FIELDS.filter((f) => !state.decided.includes(f))
    .flatMap((f): BlankField[] => (f === 'nextAction' ? ['nextActionText', 'nextActionDueDate'] : [f]))
    .filter((f) => blanks.includes(f))
}

export function toBucketItemInput(state: StepFormState, categories: string[]): BucketItemInput {
  const { category } = state.values
  return {
    ...state.values,
    category: category !== null && categories.includes(category) ? category : null,
    status: '아이디어',
  }
}
