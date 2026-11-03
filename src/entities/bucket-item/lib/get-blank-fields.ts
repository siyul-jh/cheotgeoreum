import { z } from 'zod'
import type { ItemValues } from '../model/schema'

export const BlankFieldSchema = z.enum([
  'why',
  'category',
  'targetPeriod',
  'prerequisites',
  'nextActionText',
  'nextActionDueDate', // ponytail: 날짜 선택을 없애 더는 만들지 않는다. 예전 앱이 보낼 수 있어 서버 입력 스키마에만 남긴다
])
export type BlankField = z.infer<typeof BlankFieldSchema>

export function getBlankFields(values: ItemValues): BlankField[] {
  const blanks: BlankField[] = []
  if (values.why === '') blanks.push('why')
  if (values.category === null) blanks.push('category')
  if (values.targetPeriod === null) blanks.push('targetPeriod')
  if (values.prerequisites.length === 0) blanks.push('prerequisites')
  if (values.nextAction.text === '') blanks.push('nextActionText')
  return blanks
}
