import { fieldLimits, type AiDraft, type AiField, type ItemValues } from '../model/schema'

// 병합 정책은 여기에만 둔다. 반영할 게 없으면 null
// 스칼라: [사용]은 사용자가 보고 누르는 명시 동작이라 교체
// prerequisites: 현재 목록 뒤에 덧붙임(같은 text 제외) / nextAction: 비어 있는 하위 칸만 채움
export function draftToPatch(field: AiField, draft: AiDraft, current: ItemValues): Partial<ItemValues> | null {
  switch (field) {
    case 'why':
      return draft.why === null ? null : { why: draft.why }
    case 'category':
      return draft.category === null ? null : { category: draft.category }
    case 'targetPeriod':
      return draft.targetPeriod === null ? null : { targetPeriod: draft.targetPeriod }
    case 'prerequisites': {
      // 스키마 상한을 넘기면 저장 검증에서 실패하므로 남은 자리만큼만 덧붙인다
      const added = [...new Set(draft.prerequisites)]
        .filter((text) => !current.prerequisites.some((p) => p.text === text))
        .slice(0, Math.max(0, fieldLimits.prerequisiteCount - current.prerequisites.length))
      if (added.length === 0) return null
      return { prerequisites: [...current.prerequisites, ...added.map((text) => ({ text, done: false }))] }
    }
    case 'nextAction': {
      const { text, dueDate } = current.nextAction
      const next = { text: text || (draft.nextAction?.text ?? ''), dueDate: dueDate ?? draft.nextAction?.dueDate ?? null }
      return next.text === text && next.dueDate === dueDate ? null : { nextAction: next }
    }
  }
}
