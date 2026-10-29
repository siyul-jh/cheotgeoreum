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
  const { share, pending, notice, preview } = useShareCard(item)
  return (
    <div className="rise mx-auto flex max-w-md flex-col items-center gap-[18px] text-center">
      {/* 저장 버튼이 사라지며 포커스가 body로 떨어지지 않게 제목으로 옮긴다(스크린 리더가 읽는다) */}
      <h1 ref={(el) => el?.focus()} tabIndex={-1} className="font-title text-[26px] font-bold outline-none">
        새 별이 떴어요
      </h1>
      {/* 공유될 카드(9:16) 미리보기. 그리는 동안은 같은 크기의 빈 틀 */}
      <div className="surface aspect-[9/16] h-[min(56dvh,480px)] overflow-hidden rounded-[20px] p-0">
        {preview && <img src={preview} alt={`${item.title} 별 카드`} className="rise size-full object-cover" />}
      </div>
      {/* 버튼은 화면 폭과 상관없이 한 줄에 하나씩 */}
      <div className="mt-4 flex w-full flex-col gap-2">
        <button type="button" className="btn btn-primary press" disabled={pending} onClick={() => void share()}>
          공유하기
        </button>
        <Link to="/" className="btn press flex items-center justify-center">
          목록으로
        </Link>
        <button type="button" className="btn press" onClick={onAnother}>
          하나 더 적기
        </button>
      </div>
      <p role="status" className="min-h-5 text-sm text-mute">
        {notice}
      </p>
    </div>
  )
}
