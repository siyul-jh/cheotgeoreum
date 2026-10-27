import { formatDate } from '@/shared/lib/date'
import type { ItemField, ItemValues } from '../model/schema'

const SKIPPED_LABEL = '건너뜀'

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
      const [year, month] = period.split('-')
      return month ? `${year}년 ${Number(month)}월` : `${year}년`
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
