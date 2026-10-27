import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  BucketItemInputSchema,
  CategoryPicker,
  CompanionsInput,
  NextActionInput,
  PrerequisitesInput,
  STATUSES,
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

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="title">
        {(f) => (
          <label className="flex flex-col gap-1 text-sm">
            항목
            <input
              className="field"
              value={f.state.value}
              maxLength={fieldLimits.title}
              onChange={(e) => f.handleChange(e.target.value)}
            />
          </label>
        )}
      </form.Field>
      <form.Field name="status">
        {(f) => (
          <label className="flex flex-col gap-1 text-sm">
            상태
            <select
              className="field"
              value={f.state.value}
              onChange={(e) => {
                const next = STATUSES.find((s) => s === e.target.value)
                if (next) f.handleChange(next)
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
      </form.Field>
      <form.Field name="why">
        {(f) => (
          <label className="flex flex-col gap-1 text-sm">
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
      <form.Field name="category">
        {(f) => (
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend>카테고리</legend>
            <CategoryPicker value={f.state.value} onChange={f.handleChange} />
          </fieldset>
        )}
      </form.Field>
      <form.Field name="targetPeriod">
        {(f) => (
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend>목표 시기</legend>
            <TargetPeriodInput value={f.state.value} onChange={f.handleChange} />
          </fieldset>
        )}
      </form.Field>
      <form.Field name="prerequisites">
        {(f) => (
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend>선행 과제</legend>
            <PrerequisitesInput value={f.state.value} onChange={f.handleChange} />
          </fieldset>
        )}
      </form.Field>
      <form.Field name="nextAction">
        {(f) => (
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend>다음 행동</legend>
            <NextActionInput value={f.state.value} onChange={f.handleChange} />
          </fieldset>
        )}
      </form.Field>
      <form.Field name="companions">
        {(f) => (
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend>함께할 사람</legend>
            <CompanionsInput value={f.state.value} onChange={f.handleChange} />
          </fieldset>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const blanks = getBlankFields(values)
          const aiFields = (Object.keys(AI_FIELD_LABELS) as AiField[]).filter((f) =>
            blanks.some((b) => (f === 'nextAction' ? b.startsWith('nextAction') : b === f)),
          )
          const { draft } = draftState
          return (
            <section className="flex flex-col gap-2">
              {draftState.error && (
                <p role="alert" className="surface bg-red-50 p-3 text-sm">
                  {LLM_ERROR_MESSAGES[draftState.error]}
                </p>
              )}
              {blanks.length > 0 && (
                <button
                  type="button"
                  className="btn"
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
                  // 이미 채워진 다음 행동 칸은 덮어쓰지 않는다
                  const safe =
                    field === 'nextAction' && patch.nextAction
                      ? {
                          nextAction: {
                            text: values.nextAction.text || patch.nextAction.text,
                            dueDate: values.nextAction.dueDate ?? patch.nextAction.dueDate,
                          },
                        }
                      : patch
                  return (
                    <div key={field} className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-600">{AI_FIELD_LABELS[field]}</span>
                      <AiSuggestionRow text={formatFieldValue(field, safe)} onUse={() => applyPatch(safe)} />
                    </div>
                  )
                })}
            </section>
          )
        }}
      </form.Subscribe>

      <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
        {(err) =>
          err && (
            <p role="alert" className="text-sm text-red-700">
              저장하지 못했어요. 비어 있거나 형식이 맞지 않는 칸이 있어요.
            </p>
          )
        }
      </form.Subscribe>

      <button type="submit" className="btn btn-primary">
        저장
      </button>

      {confirmingDelete ? (
        <div role="alertdialog" aria-label="삭제 확인" className="surface flex flex-col gap-2 p-3">
          <p className="text-sm">정말 삭제할까요?</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn flex-1"
              onClick={() => {
                deleteItem(id)
                onDone()
              }}
            >
              삭제
            </button>
            <button type="button" className="btn flex-1" onClick={() => setConfirmingDelete(false)}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn" onClick={() => setConfirmingDelete(true)}>
          삭제
        </button>
      )}
    </form>
  )
}
