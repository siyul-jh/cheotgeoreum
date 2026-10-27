import { createFileRoute } from '@tanstack/react-router'
import { useReducer, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { BucketItemInputSchema, selectCategories, useBucketStore } from '@/entities/bucket-item'
import { useFillBlanks } from '@/features/ai-fill'
import {
  StepForm,
  initialStepFormState,
  stepFormReducer,
  toBucketItemInput,
  undecidedAiFields,
} from '@/features/step-form'

export const Route = createFileRoute('/items/new')({ component: NewItemPage })

function NewItemPage() {
  const [state, dispatch] = useReducer(stepFormReducer, initialStepFormState)
  const { request, ...draftState } = useFillBlanks()
  const categories = useBucketStore(useShallow(selectCategories))
  const addItem = useBucketStore((s) => s.addItem)
  const navigate = Route.useNavigate()
  const [saveError, setSaveError] = useState<string | null>(null)

  const onSave = () => {
    const parsed = BucketItemInputSchema.safeParse(toBucketItemInput(state, categories))
    if (!parsed.success) {
      setSaveError('저장하지 못했어요. 비어 있거나 형식이 맞지 않는 칸이 있어요. 카드를 눌러 확인해 주세요.')
      return
    }
    addItem(parsed.data)
    void navigate({ to: '/' })
  }

  return (
    <StepForm
      state={state}
      dispatch={dispatch}
      draftState={draftState}
      onFill={() => request({ item: state.values, blankFields: undecidedAiFields(state), categories })}
      onSave={onSave}
      saveError={saveError}
    />
  )
}
