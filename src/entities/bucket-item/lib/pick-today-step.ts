import type { BucketItem } from '../model/schema'

// 목록 맨 위 '오늘의 첫걸음': 기한 빠른 순(없으면 뒤), 같으면 먼저 만든 순으로 하나
export function pickTodayStep(items: BucketItem[]): BucketItem | null {
  const candidates = items.filter(
    (i) => i.status !== '완료' && i.status !== '포기' && i.nextAction.text.trim() !== '',
  )
  const dueKey = (i: BucketItem) => i.nextAction.dueDate ?? '9999-12-31'
  candidates.sort(
    (a, b) => dueKey(a).localeCompare(dueKey(b)) || Date.parse(a.createdAt) - Date.parse(b.createdAt),
  )
  return candidates[0] ?? null
}
