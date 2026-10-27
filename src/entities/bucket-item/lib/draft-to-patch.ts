import type { AiDraft, AiField, ItemValues } from '../model/schema'

// 초안이 비었으면 null. nextAction은 초안이 null인 부분을 current로 채워 병합한다.
export function draftToPatch(field: AiField, draft: AiDraft, current: ItemValues): Partial<ItemValues> | null {
  switch (field) {
    case 'why':
      return draft.why === null ? null : { why: draft.why }
    case 'category':
      return draft.category === null ? null : { category: draft.category }
    case 'targetPeriod':
      return draft.targetPeriod === null ? null : { targetPeriod: draft.targetPeriod }
    case 'prerequisites':
      return draft.prerequisites === null
        ? null
        : { prerequisites: draft.prerequisites.map((text) => ({ text, done: false })) }
    case 'nextAction': {
      const { nextAction } = draft
      if (nextAction === null || (nextAction.text === null && nextAction.dueDate === null)) return null
      return {
        nextAction: {
          text: nextAction.text ?? current.nextAction.text,
          dueDate: nextAction.dueDate ?? current.nextAction.dueDate,
        },
      }
    }
  }
}
