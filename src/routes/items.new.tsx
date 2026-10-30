import { Link, createFileRoute } from '@tanstack/react-router'
import { useReducer, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useShallow } from 'zustand/react/shallow'
import {
  type AiDraft,
  type BlankField,
  type BucketItemInput,
  BucketItemInputSchema,
  type ItemField,
  selectCategories,
  useBucketStore,
} from '@/entities/bucket-item'
import { useFillBlanks } from '@/features/ai-fill'
import { IdeaSheet } from '@/features/idea-suggest'
import { StarCard, useStarCard } from '@/features/share-card'
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
  // AI 빈칸 채우기: 지금 단계 칸(now)을 따로 먼저 요청하고, 나머지 칸(later)은 같이 보내 뒤에서 만든다
  const now = useFillBlanks()
  const later = useFillBlanks()
  const [nowFields, setNowFields] = useState<BlankField[]>([])
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
    if (action.type !== 'skip' && action.patch?.title !== undefined && action.patch.title !== state.values.title) {
      now.reset()
      later.reset()
    }
    dispatch(action)
  }

  const onFill = () => {
    const blanks = undecidedAiFields(state)
    const first = blanks.filter((f) => stepOf(f) === state.current)
    const rest = blanks.filter((f) => !first.includes(f))
    setNowFields(first)
    for (const [hook, blankFields] of [[now, first], [later, rest]] as const) {
      if (blankFields.length > 0) hook.request({ item: state.values, blankFields, categories })
      else hook.reset()
    }
  }
  // 지금 단계 칸을 맡은 요청의 상태를 보인다. 다음 단계로 가면 뒤에서 만드는 요청의 상태(만드는 중·오류)가 보인다
  const shown = state.current !== null && nowFields.some((f) => stepOf(f) === state.current) ? now : later
  const draftState = { status: shown.status, error: shown.error, draft: mergeDrafts(later.draft, now.draft) }

  // 아이디어는 제목을 정하고, 추천받을 때 고른 카테고리는 카테고리 단계에 미리 골라 둔다(아직 정하지 않았을 때만).
  // AI 빈칸 채우기는 사용자가 [빈 칸 채우기]를 눌렀을 때만 돈다
  const onPick = (title: string, category: string | null) => {
    const prefill = category !== null && !state.decided.includes('category') ? { category } : {}
    dispatchStep({ type: 'decide', field: 'title', patch: { title, ...prefill } })
    setIdeasOpen(false)
  }

  if (saved) return <Celebration item={saved} onAnother={onAnother} />

  // 한 질문에 집중하는 흐름이라 넓은 화면에서도 좁은 기둥을 유지한다
  return (
    <div className="mx-auto max-w-md">
      <StepForm
        state={state}
        dispatch={dispatchStep}
        draftState={draftState}
        onFill={onFill}
        onOpenIdeas={() => setIdeasOpen(true)}
        onSave={onSave}
        saveError={saveError}
      />
      <ErrorBoundary fallback={<p role="alert">아이디어 추천을 불러오지 못했어요. 직접 입력해 주세요.</p>}>
        <IdeaSheet open={ideasOpen} onOpenChange={setIdeasOpen} onPick={onPick} />
      </ErrorBoundary>
    </div>
  )
}

const stepOf = (field: BlankField): ItemField =>
  field === 'nextActionText' || field === 'nextActionDueDate' ? 'nextAction' : field

// 지금 단계 초안(now)이 있는 칸은 그것을, 나머지는 뒤에서 만든 초안(later)을 쓴다
function mergeDrafts(later: AiDraft | null, now: AiDraft | null): AiDraft | null {
  if (!later || !now) return now ?? later
  return {
    why: now.why ?? later.why,
    category: now.category ?? later.category,
    targetPeriod: now.targetPeriod ?? later.targetPeriod,
    prerequisites: now.prerequisites ?? later.prerequisites,
    nextAction: now.nextAction ?? later.nextAction,
  }
}

// 컴포넌트 밖에 두어 ref가 바뀌지 않게: 처음 붙을 때만 포커스를 옮긴다(다시 그릴 때마다 포커스를 빼앗지 않게)
const focusOnMount = (el: HTMLElement | null) => el?.focus()

// 사용자가 고를 때까지 머문다. 모션 축소면 애니메이션 클래스만 꺼지고(styles.css) 화면·버튼은 같다
function Celebration({ item, onAnother }: { item: BucketItemInput; onAnother: () => void }) {
  const { card, url, png, share, save, notice } = useStarCard(item)
  return (
    <div className="rise mx-auto flex max-w-md flex-col items-center gap-[18px] text-center">
      {/* 저장 버튼이 사라지며 포커스가 body로 떨어지지 않게 제목으로 옮긴다(스크린 리더가 읽는다) */}
      <h1 ref={focusOnMount} tabIndex={-1} className="font-title text-[26px] font-bold outline-none">
        새 별이 떴어요
      </h1>
      <StarCard card={card} />
      {/* 버튼은 화면 폭과 상관없이 한 줄에 하나씩 */}
      <div className="mt-4 flex w-full flex-col gap-2">
        <button type="button" className="btn btn-primary press" disabled={url === null} onClick={() => void share()}>
          공유하기
        </button>
        <button type="button" className="btn press" disabled={png === null} onClick={save}>
          이미지로 저장
        </button>
        <button type="button" className="btn press" onClick={onAnother}>
          하나 더 적기
        </button>
        <Link to="/" className="btn press flex items-center justify-center">
          목록으로
        </Link>
      </div>
      <p role="status" className="min-h-5 text-sm text-mute">
        {notice}
      </p>
    </div>
  )
}
