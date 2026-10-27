import { createFileRoute } from '@tanstack/react-router'
import { useReducer, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useShallow } from 'zustand/react/shallow'
import { BucketItemInputSchema, selectCategories, useBucketStore } from '@/entities/bucket-item'
import { useFillBlanks } from '@/features/ai-fill'
import { IdeaSheet } from '@/features/idea-suggest'
import {
  StepForm,
  type StepFormAction,
  initialStepFormState,
  stepFormReducer,
  toBucketItemInput,
  undecidedAiFields,
} from '@/features/step-form'

export const Route = createFileRoute('/items/new')({ component: NewItemPage })

function NewItemPage() {
  const [state, dispatch] = useReducer(stepFormReducer, initialStepFormState)
  const { request, reset, ...draftState } = useFillBlanks()
  const categories = useBucketStore(useShallow(selectCategories))
  const addItem = useBucketStore((s) => s.addItem)
  const navigate = Route.useNavigate()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [ideasOpen, setIdeasOpen] = useState(false)

  const onSave = () => {
    const parsed = BucketItemInputSchema.safeParse(toBucketItemInput(state, categories))
    if (!parsed.success) {
      setSaveError('저장하지 못했어요. 비어 있거나 형식이 맞지 않는 칸이 있어요. 카드를 눌러 확인해 주세요.')
      return
    }
    addItem(parsed.data)
    void navigate({ to: '/' })
  }

  // 제목이 바뀌면 이전 제목으로 만든 초안은 맞지 않는다
  const dispatchStep = (action: StepFormAction) => {
    if (action.type === 'decide' && action.field === 'title' && action.patch.title !== state.values.title) reset()
    dispatch(action)
  }

  // 아이디어 선택이 초안의 유일한 자동 호출이다
  const onPick = (title: string) => {
    const next = stepFormReducer(state, { type: 'decide', field: 'title', patch: { title } })
    dispatch({ type: 'decide', field: 'title', patch: { title } })
    setIdeasOpen(false)
    const blankFields = undecidedAiFields(next)
    if (blankFields.length > 0) request({ item: next.values, blankFields, categories })
  }

  return (
    <>
      <StepForm
        state={state}
        dispatch={dispatchStep}
        draftState={draftState}
        onFill={() => request({ item: state.values, blankFields: undecidedAiFields(state), categories })}
        onOpenIdeas={() => setIdeasOpen(true)}
        onSave={onSave}
        saveError={saveError}
      />
      {ideasOpen && (
        <ErrorBoundary fallback={<p role="alert">아이디어 추천을 불러오지 못했어요. 직접 입력해 주세요.</p>}>
          <IdeaSheet onPick={onPick} onClose={() => setIdeasOpen(false)} />
        </ErrorBoundary>
      )}
    </>
  )
}
