import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  AI_FIELDS,
  BucketItemInputSchema,
  CategoryPicker,
  CompanionsInput,
  NextActionInput,
  PrerequisitesInput,
  STATUSES,
  StatusIcon,
  TargetPeriodInput,
  draftToPatch,
  fieldLimits,
  formatFieldValue,
  getBlankFields,
  selectCategories,
  useBucketStore,
  type AiField,
  type BucketItem,
  type ItemValues,
} from '@/entities/bucket-item'
import { useFillBlanks } from '@/features/ai-fill'
import { LLM_ERROR_MESSAGES } from '@/shared/lib/llm-result'
import { AiSuggestionRow } from '@/shared/ui/ai-suggestion-row'

type Props = { item: BucketItem; onDone: () => void }

const AI_FIELD_LABELS: Record<AiField, string> = {
  why: '왜',
  category: '카테고리',
  targetPeriod: '목표 시기',
  prerequisites: '선행 과제',
  nextAction: '다음 행동',
}

export function ItemEditForm({ item, onDone }: Props) {
  const categories = useBucketStore(useShallow(selectCategories))
  const updateItem = useBucketStore((s) => s.updateItem)
  const deleteItem = useBucketStore((s) => s.deleteItem)
  const { request, ...draftState } = useFillBlanks()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // 저장된 값이 스키마에 안 맞아도 화면은 열리고, 저장 시 검증 오류로 보인다
  const { id, createdAt, ...defaultValues } = item

  const form = useForm({
    defaultValues,
    validators: { onSubmit: BucketItemInputSchema },
    onSubmit: ({ value }) => {
      // validator를 통과했으므로 parse는 trim 변환만 한다
      const parsed = BucketItemInputSchema.parse(value)
      const { category } = parsed
      updateItem(id, { ...parsed, category: category !== null && categories.includes(category) ? category : null })
      onDone()
    },
  })

  const applyPatch = (p: Partial<ItemValues>) => {
    if (p.why !== undefined) form.setFieldValue('why', p.why)
    if (p.category !== undefined) form.setFieldValue('category', p.category)
    if (p.targetPeriod !== undefined) form.setFieldValue('targetPeriod', p.targetPeriod)
    if (p.prerequisites !== undefined) form.setFieldValue('prerequisites', p.prerequisites)
    if (p.nextAction !== undefined) form.setFieldValue('nextAction', p.nextAction)
  }

  // 모든 폭에서 한 열. 목록 카드처럼 구역을 표면(.surface)으로 묶는다
  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="surface flex flex-col gap-4 p-4">
        <form.Field name="title">
          {(f) => (
            <label className="flex flex-col gap-1.5 text-[13px] text-mute">
              항목
              <input
                className="field font-title text-[17px]"
                value={f.state.value}
                maxLength={fieldLimits.title}
                onChange={(e) => f.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="why">
          {(f) => (
            <label className="flex flex-col gap-1.5 text-[13px] text-mute">
              왜
              <textarea
                className="field"
                rows={3}
                value={f.state.value}
                maxLength={fieldLimits.why}
                onChange={(e) => f.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
      </div>
      <div className="surface flex flex-col gap-4 p-4">
        <form.Field name="category">
          {(f) => (
            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="mb-1.5 text-[13px] text-mute">카테고리</legend>
              <CategoryPicker value={f.state.value} onChange={f.handleChange} />
            </fieldset>
          )}
        </form.Field>
        <form.Field name="status">
          {(f) => (
            <label className="flex flex-col gap-1.5 text-[13px] text-mute">
              상태
              <select
                className="field select"
                value={f.state.value}
                onChange={(e) => {
                  const next = STATUSES.find((s) => s === e.target.value)
                  if (next) f.handleChange(next)
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {/* 아이콘은 base-select 목록에서만 보인다. 미지원 브라우저의 네이티브 목록은 글자만 */}
                    <StatusIcon status={s} className="size-4 shrink-0" />
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
        </form.Field>
        <form.Field name="targetPeriod">
          {(f) => (
            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="mb-1.5 text-[13px] text-mute">목표 시기</legend>
              <TargetPeriodInput value={f.state.value} onChange={f.handleChange} />
            </fieldset>
          )}
        </form.Field>
      </div>
      <div className="surface flex flex-col gap-4 p-4">
        <form.Field name="prerequisites">
          {(f) => (
            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="mb-1.5 text-[13px] text-mute">선행 과제</legend>
              <PrerequisitesInput value={f.state.value} onChange={f.handleChange} />
            </fieldset>
          )}
        </form.Field>
        <form.Field name="nextAction">
          {(f) => (
            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="mb-1.5 text-[13px] text-mute">다음 행동</legend>
              <NextActionInput value={f.state.value} onChange={f.handleChange} />
            </fieldset>
          )}
        </form.Field>
      </div>
      <div className="surface flex flex-col gap-4 p-4">
        <form.Field name="companions">
          {(f) => (
            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="mb-1.5 text-[13px] text-mute">함께할 사람</legend>
              <CompanionsInput value={f.state.value} onChange={f.handleChange} />
            </fieldset>
          )}
        </form.Field>
      </div>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const blanks = getBlankFields(values)
          const aiFields = AI_FIELDS.filter((f) =>
            blanks.some((b) => (f === 'nextAction' ? b.startsWith('nextAction') : b === f)),
          )
          const { draft } = draftState
          return (
            <section className="flex flex-col gap-2">
              {draftState.error && (
                <p role="alert" className="surface border-danger/50 p-3 text-sm">
                  {LLM_ERROR_MESSAGES[draftState.error]}
                </p>
              )}
              {blanks.length > 0 && (
                <button
                  type="button"
                  className="btn press"
                  disabled={draftState.status === 'pending'}
                  onClick={() => request({ item: values, blankFields: blanks, categories })}
                >
                  {draftState.status === 'pending' ? 'AI 초안 만드는 중…' : '빈 칸 채우기 (AI)'}
                </button>
              )}
              {draft &&
                aiFields.map((field) => {
                  const patch = draftToPatch(field, draft, values)
                  if (!patch) return null
                  return (
                    <div key={field} className="flex flex-col gap-1">
                      <span className="text-xs text-mute">{AI_FIELD_LABELS[field]}</span>
                      <AiSuggestionRow text={formatFieldValue(field, patch)} onUse={() => applyPatch(patch)} />
                    </div>
                  )
                })}
            </section>
          )
        }}
      </form.Subscribe>

      {/* 긴 폼 맨 아래까지 내리지 않아도 저장·삭제할 수 있게 하단에 붙인다 */}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-night/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:mx-0 md:px-0">
        <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
          {(err) =>
            err && (
              <p role="alert" className="text-sm text-danger">
                저장하지 못했어요. 비어 있거나 형식이 맞지 않는 칸이 있어요.
              </p>
            )
          }
        </form.Subscribe>
        {confirmingDelete ? (
          <div role="alertdialog" aria-label="삭제 확인" className="flex items-center gap-2">
            <p className="flex-1 text-sm">정말 삭제할까요?</p>
            <button
              type="button"
              className="btn press border-danger bg-transparent text-danger"
              onClick={() => {
                deleteItem(id)
                onDone()
              }}
            >
              삭제
            </button>
            <button type="button" className="btn press" onClick={() => setConfirmingDelete(false)}>
              취소
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary press flex-1">
              저장
            </button>
            <button type="button" className="btn press bg-transparent" onClick={() => setConfirmingDelete(true)}>
              삭제
            </button>
          </div>
        )}
      </div>
    </form>
  )
}
