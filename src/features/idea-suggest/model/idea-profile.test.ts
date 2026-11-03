import { expect, test } from 'vitest'
import type { BucketItem } from '@/entities/bucket-item'
import { ideaProfile } from './idea-profile'

const item = (category: string | null, companions: string[] = []) => ({ category, companions }) as BucketItem

test('많이 쓴 카테고리 3개와 기본 선택지에 있는 함께할 사람만 고른다', () => {
  const items = [item('여행', ['엄마', '가족']), item('여행'), item('건강', ['친구']), item('건강'), item('건강'), item('배움'), item('재정'), item(null)]
  expect(ideaProfile(items)).toEqual({ topCategories: ['건강', '여행', '배움'], companions: ['가족', '친구'] })
})
