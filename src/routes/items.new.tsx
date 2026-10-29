import { Link, createFileRoute } from '@tanstack/react-router'
import { useReducer, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useShallow } from 'zustand/react/shallow'
import { type BucketItemInput, BucketItemInputSchema, selectCategories, useBucketStore } from '@/entities/bucket-item'
import { useFillBlanks } from '@/features/ai-fill'
import { IdeaSheet } from '@/features/idea-suggest'
import { useShareCard } from '@/features/share-card'
import {
  StepForm,
  type StepFormAction,
  initialStepFormState,
  stepFormReducer,
  toBucketItemInput,
  undecidedAiFields,
} from '@/features/step-form'
import { StarBurst, StarIcon } from '@/shared/ui/star-icon'

export const Route = createFileRoute('/items/new')({ component: NewItemRoute })

// [하나 더 적기]는 key를 바꿔 작성 상태 전체(단계·AI 초안·오류)를 처음으로 되돌린다
function NewItemRoute() {
  const [round, setRound] = useState(0)
  return <NewItemPage key={round} onAnother={() => setRound((r) => r + 1)} />
}

function NewItemPage({ onAnother }: { onAnother: () => void }) {
  const [state, dispatch] = useReducer(stepFormReducer, initialStepFormState)
  const { request, reset, ...draftState } = useFillBlanks()
  const categories = useBucketStore(useShallow(selectCategories))
  const addItem = useBucketStore((s) => s.addItem)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [saved, setSaved] = useState<BucketItemInput | null>(null)

  const onSave = () => {
    const parsed = BucketItemInputSchema.safeParse(toBucketItemInput(state, categories))
    if (!parsed.success) {
      setSaveError('저장하지 못했어요. 비어 있거나 형식이 맞지 않는 칸이 있어요. 카드를 눌러 확인해 주세요.')
      return
    }
    addItem(parsed.data)
    setSaved(parsed.data)
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

  if (saved) return <Celebration item={saved} onAnother={onAnother} />

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

// 사용자가 고를 때까지 머문다. 모션 축소면 애니메이션 클래스만 꺼지고(styles.css) 화면·버튼은 같다
function Celebration({ item, onAnother }: { item: BucketItemInput; onAnother: () => void }) {
  const { share, pending, notice } = useShareCard(item)
  return (
    <div className="rise mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-[18px] text-center">
      <div role="status" className="flex w-full flex-col items-center gap-[18px]">
        <div className="relative flex size-20 items-center justify-center">
          <StarBurst count={10} dx={90} dy={90} delay={0.3} className="left-[34px] top-[34px]" />
          <StarIcon fill="currentColor" className="ascend size-14 text-gold" />
        </div>
        <p className="font-title text-[26px] font-bold">새 별이 떴어요</p>
        <p className="max-w-full break-words text-[15px] text-mute">{item.title}</p>
      </div>
      {/* 버튼은 화면 폭과 상관없이 한 줄에 하나씩 */}
      <div className="mt-4 flex w-full flex-col gap-2">
        <button type="button" className="btn btn-primary" disabled={pending} onClick={() => void share()}>
          공유하기
        </button>
        <Link to="/" className="btn flex items-center justify-center">
          목록으로
        </Link>
        <button type="button" className="btn" onClick={onAnother}>
          하나 더 적기
        </button>
      </div>
      <p role="status" className="min-h-5 text-sm text-mute">
        {notice}
      </p>
    </div>
  )
}
