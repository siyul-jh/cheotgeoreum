import { type ItemValues, formatFieldValue } from '@/entities/bucket-item'

// 카드에 쓸 칸·순서·문구. 줄바꿈·말줄임·배치는 그리는 쪽(Canvas/DOM)이 정한다
export type CardModel = {
  title: string
  period: string | null
  category: string | null
  why: string
  details: { label: string; value: string }[]
}

const DETAIL_LABELS = { prerequisites: '선행 과제', nextAction: '다음 행동', companions: '함께할 사람' } as const

export function buildCardModel(item: ItemValues): CardModel {
  const filled = {
    prerequisites: item.prerequisites.length > 0,
    nextAction: item.nextAction.text !== '' || item.nextAction.dueDate !== null,
    companions: item.companions.length > 0,
  }
  return {
    title: item.title,
    period: item.targetPeriod ? formatFieldValue('targetPeriod', item) : null,
    category: item.category,
    why: item.why,
    details: (['prerequisites', 'nextAction', 'companions'] as const)
      .filter((f) => filled[f])
      .map((f) => ({ label: DETAIL_LABELS[f], value: formatFieldValue(f, item) })),
  }
}
