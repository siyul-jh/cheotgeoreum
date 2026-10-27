import { z } from 'zod'
import type { ItemValues } from '../model/schema'

export const BlankFieldSchema = z.enum([
  'why',
  'category',
  'targetPeriod',
  'prerequisites',
  'nextActionText',
  'nextActionDueDate',
])
export type BlankField = z.infer<typeof BlankFieldSchema>

export function getBlankFields(values: ItemValues): BlankField[] {
  const blanks: BlankField[] = []
  if (values.why === '') blanks.push('why')
  if (values.category === null) blanks.push('category')
  if (values.targetPeriod === null) blanks.push('targetPeriod')
  if (values.prerequisites.length === 0) blanks.push('prerequisites')
  if (values.nextAction.text === '') blanks.push('nextActionText', 'nextActionDueDate')
  else if (values.nextAction.dueDate === null) blanks.push('nextActionDueDate')
  return blanks
}
