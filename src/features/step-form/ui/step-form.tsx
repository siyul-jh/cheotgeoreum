import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'
import {
  AI_FIELDS,
  CategoryPicker,
  CompanionsInput,
  NextActionInput,
  PrerequisitesInput,
  TargetPeriodInput,
  draftToPatch,
  fieldLimits,
  formatFieldValue,
  type AiDraft,
  type AiField,
  type ItemField,
  type ItemValues,
} from '@/entities/bucket-item'
import { LLM_ERROR_MESSAGES, type DraftState } from '@/shared/lib/llm-result'
import { AiSuggestionRow } from '@/shared/ui/ai-suggestion-row'
import { STEP_ORDER, undecidedAiFields, type StepFormAction, type StepFormState } from '../model/step-form-reducer'

type Props = {
  state: StepFormState
  dispatch: (a: StepFormAction) => void
  draftState: DraftState
  onFill: () => void
  onOpenIdeas: () => void
  onSave: () => void
  saveError: string | null
}

const LABELS: Record<ItemField, string> = {
  title: '항목',
  why: '왜',
  category: '카테고리',
  targetPeriod: '목표 시기',
  prerequisites: '선행 과제',
  nextAction: '다음 행동',
  companions: '함께할 사람',
}

const QUESTIONS: Record<ItemField, string> = {
  title: '어떤 일을 해보고 싶나요?',
  why: '왜 하고 싶나요?',
  category: '어떤 분야에 넣을까요?',
  targetPeriod: '언제쯤 해보고 싶나요?',
  prerequisites: '먼저 준비할 게 있나요?',
  nextAction: '가장 먼저 할 일은 뭘까요?',
  companions: '누구와 함께하고 싶나요?',
}

const isAiField = (f: ItemField): f is AiField => AI_FIELDS.some((a) => a === f)

export function StepForm({ state, dispatch, draftState, onFill, onOpenIdeas, onSave, saveError }: Props) {
  const { current, decided, values } = state
  const pending = draftState.status === 'pending'
  const canFill = decided.includes('title') && undecidedAiFields(state).length > 0
  const panelRef = useRef<HTMLDivElement>(null)

  // 단계가 바뀌면 누른 버튼이 사라지므로 새 단계로 포커스를 옮긴다(입력창이 autoFocus면 그대로 둔다)
  useEffect(() => {
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus()
  }, [current])

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label="닫기" className="btn inline-flex items-center">
          ✕
        </Link>
        <h1 className="flex-1 font-bold">새 항목</h1>
        <span className="text-sm text-zinc-600">
          {current === null ? '완료' : `${STEP_ORDER.indexOf(current) + 1} / ${STEP_ORDER.length}`}
        </span>
      </header>

      {draftState.error && (
        <div role="alert" className="surface flex items-start gap-3 bg-red-50 p-3 text-sm">
          <p className="min-w-0 flex-1 break-words">{LLM_ERROR_MESSAGES[draftState.error]}</p>
          {canFill && (
            <button type="button" className="btn shrink-0" onClick={onFill}>
              다시 시도
            </button>
          )}
        </div>
      )}

      <div ref={panelRef} tabIndex={-1} className="outline-none">
        {current === null ? (
          <section className="surface flex flex-col gap-3 p-4">
            <h2 className="text-lg font-bold">이렇게 저장할까요?</h2>
            <button type="button" className="btn btn-primary" onClick={onSave}>
              저장
            </button>
            <p className="text-sm text-zinc-600">상태는 '아이디어'로 저장 · 나중에 변경</p>
            {saveError && (
              <p role="alert" className="text-sm text-red-700">
                {saveError}
              </p>
            )}
          </section>
        ) : (
          <Step key={current} field={current} values={values} draft={draftState.draft}
            dispatch={dispatch}
            onOpenIdeas={onOpenIdeas}
          />
        )}
      </div>

      {canFill && (
        <button type="button" className="btn" disabled={pending} onClick={onFill}>
          {pending ? 'AI 초안 만드는 중…' : '빈 칸 채우기 (AI)'}
        </button>
      )}

      {decided.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-zinc-600">결정한 칸 · 누르면 수정</h2>
          <ul className="flex flex-col gap-2">
            {[...decided].reverse().map((f) => (
              <li key={f}>
                <button
                  type="button"
                  className="surface flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
                  onClick={() => dispatch({ type: 'reopen', field: f })}
                >
                  <span className="shrink-0 text-zinc-600">{LABELS[f]}</span>
                  <span className="min-w-0 flex-1 truncate">{formatFieldValue(f, values)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

type StepProps = {
  field: ItemField
  values: ItemValues
  draft: AiDraft | null
  dispatch: (a: StepFormAction) => void
  onOpenIdeas: () => void
}

// key={field}로 리마운트되어 열릴 때마다 로컬 입력이 values로 초기화된다
function Step({ field, values, draft, dispatch, onOpenIdeas }: StepProps) {
  const [local, setLocal] = useState(values)
  const edit = (patch: Partial<ItemValues>) => setLocal((l) => ({ ...l, ...patch }))
  const legendId = useId()
  const blocked = field === 'title' && local.title === ''
  const decide = () => {
    if (!blocked) dispatch({ type: 'decide', field, patch: { [field]: local[field] } })
  }
  const suggestion =
    draft && isAiField(field) ? draftToPatch(field, draft, { ...values, [field]: local[field] }) : null

  return (
    <fieldset className="flex flex-col gap-3">
      <legend id={legendId} className="mb-3 text-lg font-bold">
        {QUESTIONS[field]}
      </legend>

      {field === 'title' && (
        <input
          className="field"
          aria-labelledby={legendId}
          autoFocus
          placeholder="예: 아이슬란드에서 오로라 보기"
          value={local.title}
          maxLength={fieldLimits.title}
          onChange={(e) => edit({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            e.preventDefault()
            decide()
          }}
        />
      )}
      {field === 'title' && (
        <button type="button" className="btn" onClick={onOpenIdeas}>
          뭘 적을지 모르겠어요
        </button>
      )}
      {field === 'why' && (
        <textarea
          className="field"
          aria-labelledby={legendId}
          autoFocus
          rows={4}
          value={local.why}
          maxLength={fieldLimits.why}
          onChange={(e) => edit({ why: e.target.value })}
        />
      )}
      {field === 'category' && <CategoryPicker value={local.category} onChange={(category) => edit({ category })} />}
      {field === 'targetPeriod' && (
        <TargetPeriodInput value={local.targetPeriod} onChange={(targetPeriod) => edit({ targetPeriod })} />
      )}
      {field === 'prerequisites' && (
        <PrerequisitesInput value={local.prerequisites} onChange={(prerequisites) => edit({ prerequisites })} />
      )}
      {field === 'nextAction' && (
        <NextActionInput value={local.nextAction} onChange={(nextAction) => edit({ nextAction })} />
      )}
      {field === 'companions' && (
        <CompanionsInput value={local.companions} onChange={(companions) => edit({ companions })} />
      )}

      {suggestion && <AiSuggestionRow text={formatFieldValue(field, suggestion)} onUse={() => edit(suggestion)} />}

      <div className="flex gap-2">
        <button type="button" className="btn btn-primary flex-1 disabled:opacity-50" disabled={blocked} onClick={decide}>
          다음
        </button>
        {field !== 'title' && (
          <button type="button" className="btn" onClick={() => dispatch({ type: 'skip', field })}>
            건너뛰기
          </button>
        )}
      </div>
    </fieldset>
  )
}
