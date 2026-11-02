import { expect, test } from 'vitest'
import { chunkByBytes } from './chunk-by-bytes'

const bytes = (list: unknown[]) => new TextEncoder().encode(JSON.stringify(list)).byteLength

test('조각마다 바이트 상한을 지키고, 혼자 넘는 값은 단독 조각, 순서는 그대로', () => {
  const list = ['a'.repeat(40), 'b'.repeat(40), 'c'.repeat(300), 'd'.repeat(10)]
  const chunks = chunkByBytes(list, 100)
  expect(chunks.flat()).toEqual(list)
  expect(chunks.map((c) => c.length)).toEqual([2, 1, 1])
  for (const c of chunks) if (c.length > 1) expect(bytes(c)).toBeLessThanOrEqual(100)
})

test('작은 값 2500개는 개수 상한 1000으로 1000·1000·500', () => {
  const chunks = chunkByBytes(Array.from({ length: 2500 }, (_, i) => i), 1_000_000)
  expect(chunks.map((c) => c.length)).toEqual([1000, 1000, 500])
})

test('빈 목록은 조각 없음', () => {
  expect(chunkByBytes([], 10)).toEqual([])
})
