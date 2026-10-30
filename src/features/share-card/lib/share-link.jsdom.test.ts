import { expect, test } from 'vitest'
import { decodeCard, encodeCard } from './share-link'

// 기본(jsdom) 환경에서도 Response·CompressionStream·TextEncoder가 실제로 동작하는지 고정한다
test('jsdom에서 보통 항목 왕복', async () => {
  const item = {
    title: '오로라 보기',
    why: '하늘이 보고 싶어서',
    category: '여행',
    targetPeriod: { kind: 'end', at: '2027' } as const,
    prerequisites: [{ text: '여권', done: false }],
    nextAction: { text: '항공권 검색', dueDate: null },
    companions: ['민지'],
  }
  expect(await decodeCard(await encodeCard(item))).toEqual(item)
})
