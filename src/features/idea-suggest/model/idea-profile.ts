import { COMPANION_PRESETS, type BucketItem } from '@/entities/bucket-item'

// 추천을 내 꿈에 맞추는 데 쓰는 요약: 많이 쓴 카테고리 3개, 함께한 사람 종류(기본 선택지만)
export function ideaProfile(items: BucketItem[]): { topCategories: string[]; companions: (typeof COMPANION_PRESETS)[number][] } {
  const counts = new Map<string, number>()
  for (const { category } of items) if (category) counts.set(category, (counts.get(category) ?? 0) + 1)
  const used = new Set(items.flatMap((i) => i.companions))
  return {
    topCategories: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name),
    companions: COMPANION_PRESETS.filter((c) => used.has(c)),
  }
}
