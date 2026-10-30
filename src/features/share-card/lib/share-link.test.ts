// @vitest-environment node
import { expect, test, vi } from 'vitest'
import { BucketItemInputSchema, type ItemValues } from '@/entities/bucket-item'
import { decodeCard, encodeCard, shareUrl } from './share-link'

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

const roundTrip = async (x: ItemValues) => expect(await decodeCard(await encodeCard(x))).toEqual(ItemValuesSchema.parse(x))

test('한글·이모지 항목이 그대로 돌아온다', async () => {
  await roundTrip(item)
  expect(await decodeCard(await encodeCard(item))).toEqual(item)
})

test('긴 텍스트도 자르지 않고 전부 돌아온다(카드는 말줄임하지 않는다)', async () => {
  const long: ItemValues = {
    ...item,
    why: `${'가'.repeat(990)}😀끝`,
    prerequisites: Array.from({ length: 30 }, (_, i) => ({ text: `${i}${'나'.repeat(190)}`, done: false })),
    nextAction: { text: '다'.repeat(200), dueDate: null },
    companions: Array.from({ length: 30 }, (_, i) => `친구${i}`),
  }
  await roundTrip(long)
  const decoded = await decodeCard(await encodeCard(long))
  expect(decoded.why).toBe(long.why)
  expect(decoded.prerequisites).toHaveLength(30)
  expect(decoded.companions).toHaveLength(30)
})

test('카드 칸이 아닌 키는 링크에 담지 않고, 앞뒤 공백은 스키마대로 trim된다', async () => {
  const extra = { ...item, why: '  하늘  ', status: '계획', id: 'secret' } as ItemValues
  const decoded = await decodeCard(await encodeCard(extra))
  expect(decoded.why).toBe('하늘')
  expect(decoded).not.toHaveProperty('status')
  expect(decoded).not.toHaveProperty('id')
})

test('보통 항목 payload는 1.로 시작하고 1,000자 미만이다', async () => {
  const payload = await encodeCard(item)
  expect(payload.startsWith('1.')).toBe(true)
  expect(payload.length).toBeLessThan(1000)
  expect(payload.slice(2)).toMatch(/^[A-Za-z0-9_-]+$/)
})

test('공유 URL은 /s# 뒤에 payload를 붙인다', () => {
  vi.stubGlobal('location', { origin: 'https://example.app' })
  expect(shareUrl('1.abc')).toBe('https://example.app/s#1.abc')
  vi.unstubAllGlobals()
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

test('본문 60,001자는 해독 전에 길이로 거부한다', async () => {
  await expect(decodeCard(`1.${'A'.repeat(60_001)}`)).rejects.toThrow('알 수 없는 공유 링크')
})

// 압축이 거의 안 되는 4바이트 문자로 스키마 한도를 모두 채워도 앱이 만든 링크는 받는 쪽 상한 안에 든다
test('최악의 항목도 링크 상한(60,000자)을 넘지 않고 그대로 열린다', async () => {
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
  expect(payload.length).toBeLessThanOrEqual(60_000)
  await expect(decodeCard(payload)).resolves.toEqual(ItemValuesSchema.parse(worst))
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

test('공유 문구가 URL 뒤에 붙어 와도(%20…) 카드를 연다', async () => {
  const payload = await encodeCard(item)
  await expect(decodeCard(`${payload}%20내%20버킷리스트에%20새%20별이%20떴어요`)).resolves.toEqual(ItemValuesSchema.parse(item))
  await expect(decodeCard(`${payload} 내 버킷리스트에 새 별이 떴어요`)).resolves.toMatchObject({ title: item.title })
})
