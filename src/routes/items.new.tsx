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
import { StarBurst, StarIcon } from '@/shared/ui/star-icon'

export const Route = createFileRoute('/items/new')({ component: NewItemPage })

function NewItemPage() {
  const [state, dispatch] = useReducer(stepFormReducer, initialStepFormState)
  const { request, reset, ...draftState } = useFillBlanks()
  const categories = useBucketStore(useShallow(selectCategories))
  const addItem = useBucketStore((s) => s.addItem)
  const navigate = Route.useNavigate()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [savedTitle, setSavedTitle] = useState<string | null>(null)

  const onSave = () => {
    const parsed = BucketItemInputSchema.safeParse(toBucketItemInput(state, categories))
    if (!parsed.success) {
      setSaveError('저장하지 못했어요. 비어 있거나 형식이 맞지 않는 칸이 있어요. 카드를 눌러 확인해 주세요.')
      return
    }
    addItem(parsed.data)
    // 축하는 모션을 허용한 환경에서만 보인다. 모션 축소(또는 matchMedia 없는 환경)면 바로 목록으로
    if (window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) {
      setSavedTitle(parsed.data.title)
      setTimeout(() => void navigate({ to: '/' }), 1200)
      return
    }
    void navigate({ to: '/' })
  }

  // 제목이 바뀌면 이전 제목으로 만든 초안은 맞지 않는다. reopen patch로 바뀌는 경로도 포함
  const dispatchStep = (action: StepFormAction) => {
    if (action.type !== 'skip' && action.patch?.title !== undefined && action.patch.title !== state.values.title) reset()
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

  if (savedTitle !== null) {
    return (
      <div role="status" className="rise mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-[18px] text-center">
        <div className="relative flex size-20 items-center justify-center">
          <StarBurst count={10} dx={90} dy={90} delay={0.3} className="left-[34px] top-[34px]" />
          <StarIcon fill="currentColor" className="ascend size-14 text-gold" />
        </div>
        <p className="font-title text-[26px] font-bold">새 별이 떴어요</p>
        <p className="max-w-full break-words text-[15px] text-mute">{savedTitle}</p>
      </div>
    )
  }

  // 한 질문에 집중하는 흐름이라 넓은 화면에서도 좁은 기둥을 유지한다
  return (
    <div className="mx-auto max-w-md">
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
    </div>
  )
}
