import { formatDate } from '@/shared/lib/date'
import type { ItemField, ItemValues } from '../model/schema'

const SKIPPED_LABEL = '건너뜀'

// range의 시작은 입력 중(저장 전)에만 빌 수 있다. 빈 시작은 ?로
const formatPoint = (point: string | null) => {
  if (!point) return '?'
  const [year, month] = point.split('-')
  return month ? `${year}년 ${Number(month)}월` : `${year}년`
}

export function formatFieldValue(field: ItemField, values: Partial<ItemValues>): string {
  switch (field) {
    case 'title':
      return values.title || SKIPPED_LABEL
    case 'why':
      return values.why || SKIPPED_LABEL
    case 'category':
      return values.category ?? SKIPPED_LABEL
    case 'targetPeriod': {
      const period = values.targetPeriod
      if (!period) return SKIPPED_LABEL
      switch (period.kind) {
        case 'start':
          return `${formatPoint(period.at)}쯤`
        case 'end':
          return `${formatPoint(period.at)}까지`
        case 'range':
          return period.to === null ? `${formatPoint(period.from)}부터` : `${formatPoint(period.from)} ~ ${formatPoint(period.to)}`
      }
    }
    case 'prerequisites':
      return values.prerequisites?.map((p) => p.text).join(', ') || SKIPPED_LABEL
    case 'nextAction': {
      const dueDate = values.nextAction?.dueDate
      return [values.nextAction?.text, dueDate && formatDate(dueDate)].filter(Boolean).join(' · ') || SKIPPED_LABEL
    }
    case 'companions':
      return values.companions?.join(', ') || SKIPPED_LABEL
  }
}
