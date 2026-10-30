// @vitest-environment node
import { expect, test } from 'vitest'
import { BucketItemInputSchema, type ItemValues } from '@/entities/bucket-item'
import { clipForCard, decodeCard, encodeCard, shareUrl } from './share-link'

const ItemValuesSchema = BucketItemInputSchema.omit({ status: true })

const item: ItemValues = {
  title: '오로라 보기 🌌',
  why: '하늘이 보고 싶어서',
  category: '여행',
  targetPeriod: { kind: 'start', at: '2027-03' },
  prerequisites: [{ text: '여권', done: true }, { text: '적금', done: false }, { text: '휴가', done: false }],
  nextAction: { text: '항공권 검색', dueDate: '2026-11-03' },
  companions: ['민지', '준호'],
}

const roundTrip = async (x: ItemValues) => expect(await decodeCard(await encodeCard(x))).toEqual(ItemValuesSchema.parse(clipForCard(x)))

test('한글·이모지 항목이 그대로 돌아온다', async () => {
  await roundTrip(item)
  expect(await decodeCard(await encodeCard(item))).toEqual(item)
})

test('긴 텍스트는 카드 표시 범위로 잘려 돌아온다(서로게이트 쌍은 쪼개지 않는다)', async () => {
  const long: ItemValues = {
    ...item,
    why: `${'가'.repeat(199)}😀끝`,
    prerequisites: Array.from({ length: 30 }, (_, i) => ({ text: `${i}${'나'.repeat(70)}`, done: false })),
    nextAction: { text: '다'.repeat(200), dueDate: null },
    companions: Array.from({ length: 30 }, (_, i) => `친구${i}`),
  }
  await roundTrip(long)
  const decoded = await decodeCard(await encodeCard(long))
  expect(decoded.why).toBe(`${'가'.repeat(199)}😀`)
  expect(decoded.prerequisites).toHaveLength(10)
  expect(Array.from(decoded.prerequisites[0].text)).toHaveLength(60)
  expect(decoded.nextAction.text).toBe('다'.repeat(100))
  expect(decoded.companions).toHaveLength(10)
})

test('잘린 뒤 앞뒤 공백은 trim되고 빈 항목은 버린다', async () => {
  const spaced: ItemValues = {
    ...item,
    why: `  ${'가'.repeat(197)}   뒤`,
    prerequisites: [{ text: `${' '.repeat(60)}x`, done: false }, { text: ' 여권 ', done: true }],
    companions: ['  ', ' 민지 '],
  }
  const clipped = clipForCard(spaced)
  expect(clipped.why).toBe('가'.repeat(197))
  expect(clipped.prerequisites).toEqual([{ text: '여권', done: true }])
  expect(clipped.companions).toEqual(['민지'])
  await roundTrip(spaced)
})

test('보통 항목 payload는 1.로 시작하고 1,000자 미만이다', async () => {
  const payload = await encodeCard(item)
  expect(payload.startsWith('1.')).toBe(true)
  expect(payload.length).toBeLessThan(1000)
  expect(payload.slice(2)).toMatch(/^[A-Za-z0-9_-]+$/)
})

test('공유 URL은 /s# 뒤에 payload를 붙인다', () => {
  expect(shareUrl('1.abc', 'https://example.app')).toBe('https://example.app/s#1.abc')
})

async function deflateBase64url(text: string) {
  const stream = new Response(new TextEncoder().encode(text)).body!.pipeThrough(new CompressionStream('deflate-raw'))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

test.each([
  ['빈 문자열', ''],
  ['접두사만', '1.'],
  ['모르는 버전', '2.abc'],
])('%s는 거부한다', async (_, payload) => {
  await expect(decodeCard(payload)).rejects.toThrow()
})

test('8,001자 입력은 해독 전에 길이로 거부한다', async () => {
  await expect(decodeCard(`1.${'A'.repeat(7999)}`)).rejects.toThrow('알 수 없는 공유 링크')
})

// 압축이 거의 안 되는 4바이트 문자로 카드 표시 한도를 모두 채워도 앱이 만든 링크는 받는 쪽 상한 안에 든다
test('최악의 항목도 링크가 8,000자를 넘지 않고 그대로 열린다', async () => {
  let seed = 7
  const rand = (n: number) =>
    Array.from({ length: n }, () => {
      seed = (seed * 16807) % 2147483647
      return String.fromCodePoint(0x20000 + (seed % 0x5000))
    }).join('')
  const worst: ItemValues = {
    title: rand(100),
    why: rand(1000),
    category: rand(30),
    targetPeriod: { kind: 'range', from: '2027-01', to: '2028-12' },
    prerequisites: Array.from({ length: 30 }, () => ({ text: rand(200), done: false })),
    nextAction: { text: rand(200), dueDate: '2027-01-01' },
    companions: Array.from({ length: 30 }, () => rand(30)),
  }
  const payload = await encodeCard(worst)
  expect(payload.length).toBeLessThanOrEqual(8000)
  await expect(decodeCard(payload)).resolves.toEqual(ItemValuesSchema.parse(clipForCard(worst)))
})

test('base64 한 글자 변조는 거부한다', async () => {
  const payload = await encodeCard(item)
  const i = 2 + 3
  const tampered = payload.slice(0, i) + (payload[i] === 'A' ? 'B' : 'A') + payload.slice(i + 1)
  await expect(decodeCard(tampered)).rejects.toThrow()
})

test('뒤를 자른 payload는 거부한다', async () => {
  const payload = await encodeCard(item)
  await expect(decodeCard(payload.slice(0, -10))).rejects.toThrow()
})

test('스키마에 맞지 않는 JSON은 거부한다', async () => {
  await expect(decodeCard(`1.${await deflateBase64url(JSON.stringify({ ...item, title: '' }))}`)).rejects.toThrow()
})

test('압축 폭탄(작은 payload, 큰 출력)은 거부한다', async () => {
  const payload = `1.${await deflateBase64url('a'.repeat(100_000))}`
  expect(payload.length).toBeLessThan(8000)
  await expect(decodeCard(payload)).rejects.toThrow('너무 커요')
})
