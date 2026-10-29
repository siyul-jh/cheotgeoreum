import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'
import {
  AI_FIELDS,
  CategoryPicker,
  CompanionsInput,
  NextActionInput,
  PrerequisitesInput,
  TargetPeriodInput,
  TargetPeriodSchema,
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
import { StarIcon } from '@/shared/ui/star-icon'
import { XIcon } from '@/shared/ui/x-icon'
import { STEP_ORDER, undecidedAiFields, type StepFormAction, type StepFormState } from '../model/step-form-reducer'

type Props = {
  state: StepFormState
  dispatch: (a: StepFormAction) => void
  draftState: DraftState<AiDraft>
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
  // 단계가 바뀌면 로컬 입력을 values로 초기화한다. 카드로 다른 단계를 열 때 patch로 넘기려고 여기 둔다
  const [local, setLocal] = useState({ step: current, values })
  if (local.step !== current) setLocal({ step: current, values })
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
        <Link
          to="/"
          aria-label="닫기"
          className="press flex size-11 shrink-0 items-center justify-center rounded-full bg-card"
        >
          <XIcon className="size-[18px]" />
        </Link>
        <h1 className="sr-only">새 꿈</h1>
        <div
          role="img"
          aria-label={`${STEP_ORDER.length}단계 중 ${decided.length}단계 완료`}
          className="flex flex-1 items-center justify-between"
        >
          {STEP_ORDER.map((f) =>
            // key: 채워질 때 새로 마운트돼야 pop이 돈다
            decided.includes(f) ? (
              <StarIcon key={`${f}-on`} fill="currentColor" className="pop size-4 text-gold" />
            ) : (
              <StarIcon
                key={`${f}-off`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
                className={`size-4 ${f === current ? 'glow text-gold' : 'text-dim'}`}
              />
            ),
          )}
        </div>
      </header>

      {draftState.error && (
        <div role="alert" className="surface flex items-start gap-3 border-danger/50 p-3 text-sm">
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
          <section className="rise flex flex-col gap-4">
            <h2 className="font-title text-[28px] font-bold leading-snug">이렇게 저장할까요?</h2>
            <button type="button" className="btn btn-primary press min-h-[54px] text-base" onClick={onSave}>
              저장
            </button>
            <p className="text-sm text-mute">상태는 '아이디어'로 저장 · 나중에 변경</p>
            {saveError && (
              <p role="alert" className="text-sm text-danger">
                {saveError}
              </p>
            )}
          </section>
        ) : (
          <Step
            key={current}
            field={current}
            values={values}
            local={local.values}
            edit={(patch) => setLocal((l) => ({ ...l, values: { ...l.values, ...patch } }))}
            draft={draftState.draft}
            dispatch={dispatch}
            onOpenIdeas={onOpenIdeas}
          />
        )}
      </div>

      {canFill && (
        <button type="button" className="btn press" disabled={pending} onClick={onFill}>
          {pending ? 'AI 초안 만드는 중…' : '빈 칸 채우기 (AI)'}
        </button>
      )}

      {decided.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[13px] text-mute">정한 칸 · 누르면 고칠 수 있어요</h2>
          <ul className="flex flex-col gap-2">
            {/* 정한 순서가 아니라 단계 순서로 고정(최근 단계가 위). 다시 열어 고쳐도 자리가 바뀌지 않는다 */}
            {[...STEP_ORDER].reverse().filter((f) => decided.includes(f)).map((f) => (
              <li key={f}>
                <button
                  type="button"
                  className="surface press drop flex min-h-12 w-full flex-col items-start gap-0.5 rounded-[14px] px-3.5 py-2.5 text-left"
                  onClick={() =>
                    dispatch({ type: 'reopen', field: f, patch: current === null ? {} : { [current]: local.values[current] } })
                  }
                >
                  <span className="text-xs text-mute">{LABELS[f]}</span>
                  <span className="w-full min-w-0 break-words text-[15px]">{formatFieldValue(f, values)}</span>
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
  local: ItemValues
  edit: (patch: Partial<ItemValues>) => void
  draft: AiDraft | null
  dispatch: (a: StepFormAction) => void
  onOpenIdeas: () => void
}

function Step({ field, values, local, edit, draft, dispatch, onOpenIdeas }: StepProps) {
  const legendId = useId()
  // 기간이 덜 채워졌거나 역순이면 확정하지 않는다. 이유는 TargetPeriodInput이 그 자리에 보인다
  const blocked =
    (field === 'title' && local.title.trim() === '') ||
    (field === 'targetPeriod' && !TargetPeriodSchema.nullable().safeParse(local.targetPeriod).success)
  const decide = () => {
    if (!blocked) dispatch({ type: 'decide', field, patch: { [field]: local[field] } })
  }
  const suggestion =
    draft && isAiField(field) ? draftToPatch(field, draft, { ...values, [field]: local[field] }) : null

  return (
    <fieldset className="rise flex flex-col gap-3">
      <legend id={legendId} className="mb-4 font-title text-[28px] font-bold leading-snug">
        {QUESTIONS[field]}
      </legend>

      {field === 'title' && (
        <input
          className="field min-h-[54px] text-[17px]"
          aria-labelledby={legendId}
          autoFocus
          placeholder="예: 아이슬란드에서 오로라 보기"
          value={local.title}
          maxLength={fieldLimits.title}
          onChange={(e) => edit({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return // 229: Safari IME
            e.preventDefault()
            decide()
          }}
        />
      )}
      {field === 'title' && (
        <button type="button" className="btn press" onClick={onOpenIdeas}>
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
        <button
          type="button"
          className="btn btn-primary press min-h-[54px] flex-1 text-base"
          disabled={blocked}
          onClick={decide}
        >
          다음
        </button>
        {field !== 'title' && (
          <button
            type="button"
            className="btn press min-h-[54px] bg-transparent px-5"
            onClick={() => dispatch({ type: 'skip', field })}
          >
            건너뛰기
          </button>
        )}
      </div>
    </fieldset>
  )
}
